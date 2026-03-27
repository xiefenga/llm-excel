import { Outlet, useOutlet } from 'react-router';
import UserManagementPage from "~/features/admin/user-management-page";

const AdminUsersRoute = () => {
  const outlet = useOutlet();

  // 如果有活动的子路由（如 /threads 或 /files），只渲染子路由
  // 否则渲染用户管理页面
  if (outlet) {
    return <Outlet />;
  }

  return <UserManagementPage />;
};

export default AdminUsersRoute;
