#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_OWNER="xiefenga"
REPO_NAME="selgetabel"
BRANCH="main"
TARGET_DIR="docker"
EXCLUDED_FILES=("scripts" "docker-compose.build.yml" "docker-compose.dev.yml")

# Print functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
check_dependencies() {
    print_info "Checking dependencies..."

    if ! command_exists curl; then
        print_error "curl is not installed. Please install curl first."
        exit 1
    fi

    if ! command_exists tar; then
        print_error "tar is not installed. Please install tar first."
        exit 1
    fi

    print_success "All dependencies are installed."
}

# Check Docker dependencies
check_docker() {
    print_info "Checking Docker dependencies..."

    if ! command_exists docker; then
        print_error "docker is not installed. Please install Docker first."
        print_info "Visit https://docs.docker.com/get-docker/ for installation instructions."
        exit 1
    fi

    if ! docker compose version >/dev/null 2>&1; then
        print_error "docker compose is not available. Please install Docker Compose V2."
        exit 1
    fi

    print_success "Docker dependencies are installed."
}

# Load environment variable from .env file
load_env_var() {
    local var_name="$1"
    local default_value="$2"
    local value
    value=$(grep -E "^${var_name}=" ./.env 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    echo "${value:-$default_value}"
}

# Wait for a service to become healthy
wait_for_service() {
    local service_name="$1"
    local check_cmd="$2"
    local max_attempts=30
    local interval=2
    local attempt=1

    print_info "Waiting for ${service_name} to be ready..."

    while [ $attempt -le $max_attempts ]; do
        if eval "$check_cmd" >/dev/null 2>&1; then
            print_success "${service_name} is ready."
            return 0
        fi
        sleep $interval
        attempt=$((attempt + 1))
    done

    print_error "${service_name} did not become ready within $((max_attempts * interval)) seconds."
    exit 1
}

# Initialize services (DB migrations, seed data, MinIO setup)
initialize() {
    print_info "Initializing services..."

    # Load env vars
    local pg_user
    pg_user=$(load_env_var "POSTGRES_USER" "llmexcel")
    local pg_db
    pg_db=$(load_env_var "POSTGRES_DB" "llmexcel")
    local minio_root_user
    minio_root_user=$(load_env_var "MINIO_ROOT_USER" "minioadmin")
    local minio_root_password
    minio_root_password=$(load_env_var "MINIO_ROOT_PASSWORD" "")
    local minio_bucket
    minio_bucket=$(load_env_var "MINIO_BUCKET" "llm-excel")

    # Step 1: Start infrastructure services only
    print_info "Starting PostgreSQL and MinIO..."
    docker compose up -d postgres minio

    # Step 2: Wait for PostgreSQL
    wait_for_service "PostgreSQL" \
        "docker exec selgetabel-postgres pg_isready -U ${pg_user} -d ${pg_db}"

    # Step 3: Wait for MinIO
    wait_for_service "MinIO" \
        "docker exec selgetabel-minio mc ready local"

    # Step 4: Run database migrations
    print_info "Running database migrations..."
    docker compose run --rm api /app/.venv/bin/alembic upgrade head
    print_success "Database migrations completed."

    # Step 5: Execute SQL init data files
    if [ -d "./postgres/init_sqls" ]; then
        local sql_files
        sql_files=$(find ./postgres/init_sqls -name '*.sql' | sort)
        if [ -n "$sql_files" ]; then
            print_info "Loading database init data..."
            for sql_file in $sql_files; do
                local filename
                filename=$(basename "$sql_file")
                print_info "Executing: ${filename}"
                docker exec -i selgetabel-postgres psql -U "${pg_user}" -d "${pg_db}" < "$sql_file"
            done
            print_success "Database init data loaded."
        fi
    fi

    # Step 6: Setup MinIO bucket and upload init data
    print_info "Setting up MinIO bucket..."
    docker exec selgetabel-minio mc alias set local http://localhost:9000 "${minio_root_user}" "${minio_root_password}"
    docker exec selgetabel-minio mc mb "local/${minio_bucket}" --ignore-existing
    docker exec selgetabel-minio mc anonymous set public "local/${minio_bucket}"
    print_success "MinIO bucket configured."

    if [ -d "./minio/init_data" ] && [ "$(ls -A ./minio/init_data 2>/dev/null)" ]; then
        print_info "Uploading MinIO init data..."
        for file in ./minio/init_data/*; do
            local filename
            filename=$(basename "$file")
            print_info "Uploading: ${filename}"
            docker cp "$file" "selgetabel-minio:/tmp/${filename}"
            docker exec selgetabel-minio mc cp "/tmp/${filename}" "local/${minio_bucket}/__SYS__/${filename}"
        done
        print_success "MinIO init data uploaded."
    fi

}

# Download and extract docker directory
download_docker_dir() {
    print_info "Downloading Selgetabel deployment files from GitHub..."

    local temp_dir=$(mktemp -d)
    local tarball_url="https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/${BRANCH}.tar.gz"

    # Download tarball
    if ! curl -fsSL "$tarball_url" -o "${temp_dir}/repo.tar.gz"; then
        print_error "Failed to download repository from ${tarball_url}"
        rm -rf "$temp_dir"
        exit 1
    fi

    print_info "Extracting files..."

    # Extract docker directory
    tar -xzf "${temp_dir}/repo.tar.gz" -C "$temp_dir"

    local extracted_dir="${temp_dir}/${REPO_NAME}-${BRANCH}"
    local source_docker_dir="${extracted_dir}/${TARGET_DIR}"

    if [ ! -d "$source_docker_dir" ]; then
        print_error "Docker directory not found in repository"
        rm -rf "$temp_dir"
        exit 1
    fi

    # Check if any files from docker directory already exist
    local has_conflicts=false
    # Enable dotglob to match hidden files
    shopt -s dotglob
    for item in "${source_docker_dir}"/*; do
        local basename=$(basename "$item")
        # Skip excluded files
        local is_excluded=false
        for excluded in "${EXCLUDED_FILES[@]}"; do
            if [ "$basename" = "$excluded" ]; then
                is_excluded=true
                break
            fi
        done

        if [ "$is_excluded" = true ]; then
            continue
        fi

        if [ -e "./${basename}" ]; then
            has_conflicts=true
            break
        fi
    done
    shopt -u dotglob

    if [ "$has_conflicts" = true ]; then
        print_warning "Some files from docker directory already exist in current directory."
        read -p "Do you want to overwrite them? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Installation cancelled."
            rm -rf "$temp_dir"
            exit 0
        fi
    fi

    # Copy docker directory contents to current directory
    print_info "Copying files to current directory..."
    # Enable dotglob to match hidden files
    shopt -s dotglob
    for item in "${source_docker_dir}"/*; do
        local basename=$(basename "$item")

        # Skip excluded files
        local is_excluded=false
        for excluded in "${EXCLUDED_FILES[@]}"; do
            if [ "$basename" = "$excluded" ]; then
                is_excluded=true
                print_info "Skipped: ${excluded}"
                break
            fi
        done

        if [ "$is_excluded" = false ]; then
            cp -r "$item" "./"
            print_info "Copied: ${basename}"
        fi
    done
    shopt -u dotglob

    # Cleanup
    rm -rf "$temp_dir"

    print_success "Deployment files downloaded successfully!"
}

# Setup environment file
setup_env() {
    if [ -f "./.env.example" ]; then
        if [ ! -f "./.env" ]; then
            print_info "Creating .env file from .env.example..."
            mv "./.env.example" "./.env"
        else
            print_info ".env file already exists, skipping..."
        fi
    fi

    # Generate JWT_SECRET_KEY if not set
    if [ -f "./.env" ]; then
        local current_jwt=$(grep -E "^JWT_SECRET_KEY=" ./.env | cut -d'=' -f2-)
        if [ -z "$current_jwt" ]; then
            local jwt_key=$(openssl rand -hex 32)
            sed -i.bak "s|^JWT_SECRET_KEY=.*|JWT_SECRET_KEY=${jwt_key}|" ./.env
            rm -f ./.env.bak
            print_success "JWT_SECRET_KEY generated automatically."
        else
            print_info "JWT_SECRET_KEY already set, skipping..."
        fi
    fi
}

# Print next steps
print_next_steps() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Installation completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo ""
    echo "1. Start the application:"
    echo -e "   ${YELLOW}docker compose up -d${NC}"
    echo ""
    echo "2. Configure LLM provider in the web UI settings."
    echo ""
    echo "3. Access the application:"
    echo "   - Web UI: http://localhost:8080"
    echo "   - API: http://localhost:8080/api"
    echo ""
    echo "For more information, visit:"
    echo "https://github.com/${REPO_OWNER}/${REPO_NAME}"
    echo ""
}

# Main function
main() {
    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  Selgetabel Quick Installation${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""

    check_dependencies
    check_docker
    download_docker_dir
    setup_env
    initialize
    print_next_steps
}

# Run main function
main
