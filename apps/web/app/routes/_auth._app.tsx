import { Outlet } from 'react-router'
import DashboardLayout from '~/components/layout/app-layout'

const AppLayout = () => {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  )
}

export default AppLayout