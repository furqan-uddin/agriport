import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded'
import ContactsRoundedIcon from '@mui/icons-material/ContactsRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded'
import RedeemRoundedIcon from '@mui/icons-material/RedeemRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import WorkspaceLayout from './WorkspaceLayout'
import type { WorkspaceConfig } from './WorkspaceLayout'
import { ROUTES } from '@/constants'

const config: WorkspaceConfig = {
  subtitle: 'Sales Executive App',
  navLabel: 'SALES EXECUTIVE',
  nav: [
    { label: 'Dashboard', to: '/executive', icon: <SpaceDashboardRoundedIcon />, end: true },
    { label: 'Customers', to: '/executive/customers', icon: <ContactsRoundedIcon /> },
    { label: 'Sales & Enquiries', to: '/executive/enquiries', icon: <ReceiptLongRoundedIcon /> },
    {
      label: 'Add Stock',
      to: '/executive/add-stock',
      icon: <Inventory2RoundedIcon />,
      children: [
        { label: 'New Purchase', to: '/executive/add-stock/new-purchase' },
        { label: 'On Arrival', to: '/executive/add-stock/on-arrival' },
        { label: 'Purchase History', to: '/executive/add-stock/purchases' },
        { label: 'Arrivals Log', to: '/executive/add-stock/arrivals' },
      ],
    },
    { label: 'New Sale', to: '/executive/sales', icon: <PointOfSaleRoundedIcon /> },
    { label: 'Products', to: '/executive/products', icon: <Inventory2RoundedIcon /> },
    { label: 'My Incentives', to: '/executive/incentives', icon: <RedeemRoundedIcon /> },
  ],
  titles: {
    '/executive': 'Dashboard',
    '/executive/customers': 'Customer Management',
    '/executive/enquiries': 'Sales & Enquiries',
    '/executive/sales': 'Sales Operations',
    '/executive/products': 'Product Management',
    '/executive/incentives': 'My Incentives',
    '/executive/add-stock/new-purchase': 'New Purchase',
    '/executive/add-stock/on-arrival': 'On Arrival',
    '/executive/add-stock/purchases': 'Purchase History',
    '/executive/add-stock/arrivals': 'Arrivals Log',
  },
  user: { name: 'Rahul Verma', role: 'Sales Executive · Pune', initials: 'RV' },
  exit: { to: ROUTES.home, label: 'Customer App', icon: <StorefrontRoundedIcon /> },
  loginPath: '/executive/login',
}

export default function ExecutiveLayout() {
  return <WorkspaceLayout config={config} />
}
