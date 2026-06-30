import { useAppSelector } from '@/redux/hooks'
import { initials } from '@/utils/format'
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import GroupRoundedIcon from '@mui/icons-material/GroupRounded'
import HubRoundedIcon from '@mui/icons-material/HubRounded'
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded'
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded'
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded'
import WorkspaceLayout from './WorkspaceLayout'
import type { WorkspaceConfig } from './WorkspaceLayout'
import { ROUTES } from '@/constants'

export default function AdminLayout() {
  const user = useAppSelector((s) => s.auth.user)
  const isManager = user?.role === 'manager'

  const navItems = [
    { label: 'Dashboard', to: '/admin', icon: <SpaceDashboardRoundedIcon />, end: true },
    { label: 'Products', to: '/admin/products', icon: <Inventory2RoundedIcon /> },
    ...(!isManager ? [{ label: 'Categories', to: '/admin/categories', icon: <CategoryRoundedIcon /> }] : []),
    { label: 'Orders & Payments', to: '/admin/orders', icon: <ReceiptLongRoundedIcon /> },
    ...(!isManager ? [{ label: 'Users', to: '/admin/users', icon: <GroupRoundedIcon /> }] : []),
    { label: 'Sales Team', to: '/admin/sales', icon: <HubRoundedIcon /> },
    {
      label: 'Add Stock',
      to: '/admin/add-stock',
      icon: <Inventory2RoundedIcon />,
      children: [
        { label: 'New Purchase', to: '/admin/add-stock/new-purchase' },
        { label: 'On Arrival', to: '/admin/add-stock/on-arrival' },
        { label: 'Purchase History', to: '/admin/add-stock/purchases' },
      ],
    },
    { label: 'New Sale', to: '/admin/new-sale', icon: <PointOfSaleRoundedIcon /> },
    { label: 'Inventory', to: '/admin/inventory', icon: <WarehouseRoundedIcon /> },
    { label: 'Reports', to: '/admin/reports', icon: <InsightsRoundedIcon /> },
    ...(!isManager ? [{ label: 'Storefront', to: '/admin/storefront', icon: <PaletteRoundedIcon /> }] : []),
  ]

  const titles = {
    '/admin': 'Dashboard',
    '/admin/products': 'Product Management',
    '/admin/categories': 'Category Management',
    '/admin/orders': 'Order & Payment Management',
    '/admin/users': 'User Management',
    '/admin/sales': 'Sales Team Management',
    '/admin/inventory': 'Inventory & Stock Approvals',
    '/admin/reports': 'Reports & Analytics',
    '/admin/storefront': 'Storefront Content',
    '/admin/new-sale': 'Sales Operations',
    '/admin/add-stock/new-purchase': 'New Purchase',
    '/admin/add-stock/on-arrival': 'On Arrival',
    '/admin/add-stock/purchases': 'Purchase History',
  }

  const config: WorkspaceConfig = {
    subtitle: isManager ? 'Agriport Sales Manager Workspace' : 'Agriport Admin Control Panel',
    navLabel: isManager ? 'TEAM OPERATION' : 'MANAGEMENT',
    nav: navItems,
    titles,
    user: {
      name: user?.fullName || 'User',
      role: isManager ? 'Sales Manager' : 'Super Admin',
      initials: initials(user?.fullName || 'AD'),
    },
    exit: { to: ROUTES.home, label: 'Customer App', icon: <StorefrontRoundedIcon /> },
    loginPath: '/admin/login',
  }

  return <WorkspaceLayout config={config} />
}
