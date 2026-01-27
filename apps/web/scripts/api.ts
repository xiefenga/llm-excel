import path from 'node:path'
import fs from 'node:fs/promises'
import process from 'node:process'

import { config as loadEnv } from 'dotenv'
import openapiTS, { astToString } from 'openapi-typescript'

loadEnv()

const SCHEMA_FILE = path.resolve(process.cwd(), 'app/types/api.d.ts')

const API_BASE_URL = process.env.API_BASE_URL

if (!API_BASE_URL) {
  console.error('API_BASE_URL is not defined in .env file')
  process.exit(1)
}

const ast = await openapiTS(new URL('/openapi.json', API_BASE_URL), {
  defaultNonNullable: false,
})

const contents = astToString(ast)

await fs.writeFile(SCHEMA_FILE, `/* eslint-disable */\n\n${contents}`)

console.log('API Schema generated successfully')