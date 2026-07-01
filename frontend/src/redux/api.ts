import { createApi } from '@reduxjs/toolkit/query/react'
import { apiClient } from './apiClient'
import type {
  Product,
  Category,
  Order,
  Transaction,
  BusinessDocument,
  Banner,
  AdminUser,
  ManagerRow,
  ExecutiveApproval,
  StockRequest,
  DashboardStats,
  SalesPoint,
  CategorySales,
  Executive,
  CRMCustomer,
  FollowUp,
  SaleRecord,
  VendorPurchase,
  IncentivePoint,
  SalesStats,
  HeroContent,
  TrustBadge,
  InAppNotification,
} from '@/types'


export interface ProductQuery {
  search?: string
  category?: string
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating'
  inStockOnly?: boolean
  isExecutive?: boolean
}

const axiosBaseQuery = () => async ({ url, method, data, body, params, headers }: any) => {
  try {
    const result = await apiClient({ url, method, data: data || body, params, headers });
    return { data: result.data };
  } catch (axiosError: any) {
    return {
      error: {
        status: axiosError.response?.status,
        data: axiosError.response?.data || axiosError.message,
      },
    };
  }
};


const mapProductResponse = (p: any): Product => {
  const specifications: Record<string, string> = {
    Origin: p.origin || 'India',
    Grade: p.grade || 'Premium',
    ...(p.specifications || {}),
  };

  return {
    id: p._id,
    sku: p.sku || '',
    name: p.name,
    category: p.category?.name || p.category?.toString() || 'General',
    images: p.images && p.images.length > 0 ? p.images : [],
    shortDescription: '',
    description: '',
    specifications,
    unit: p.unit || 'kg',
    moq: 1,
    availableStock: p.stock || 0,
    stockStatus: (p.stock || 0) > 0 ? 'in_stock' : 'out_of_stock',
    basePrice: 0,
    currency: 'INR',
    pricingSlabs: [],
    rating: 5,
    origin: p.origin || 'India',
    leadTimeDays: specifications['Lead Time'] ? Number(specifications['Lead Time']) : 0,
    sizeVariants: p.sizeVariants ? p.sizeVariants.map((v: any) => ({
      size: v.size,
      stock: v.stock || 0,
      price: v.price || 0,
      packingType: v.packingType || 'Cartoon',
      netWeight: v.netWeight,
      grossWeight: v.grossWeight,
    })) : [],
  };
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Product', 'Category', 'Order', 'Document', 'AdminUser', 'StockRequest', 'Executive', 'Manager', 'SalesSetting', 'Storefront', 'CrmCustomer', 'FollowUp', 'Notification'],
  endpoints: (build) => ({
    getProducts: build.query<Product[], ProductQuery | void>({
      query: (arg) => {
        const q = arg || {};
        return {
          url: '/products',
          method: 'GET',
          params: {
            search: q.search,
            category: q.category === 'all' ? undefined : q.category,
            inStockOnly: q.inStockOnly ? 'true' : undefined,
            sort: q.sort === 'rating' ? 'relevance' : q.sort,
            isExecutive: q.isExecutive ? 'true' : undefined,
          },
        };
      },
      transformResponse: (response: any) => {
        return (response.data.products || []).map(mapProductResponse);
      },
      providesTags: ['Product'],
    }),
    getProduct: build.query<Product | undefined, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        return response.data ? mapProductResponse(response.data) : undefined;
      },
      providesTags: ['Product'],
    }),
    getCategories: build.query<Category[], void>({
      query: () => ({
        url: '/categories',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        return (response.data || []).map((cat: any) => ({
          id: cat._id,
          name: cat.name,
          slug: cat.slug,
          productCount: cat.productCount || 0,
          icon: 'category',
          isActive: cat.isActive !== false,
        }));
      },
      providesTags: ['Category'],
    }),
    getBanners: build.query<Banner[], void>({
      query: () => ({
        url: '/storefront',
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data?.banners || [],
    }),
    getOrders: build.query<Order[], void>({
      query: () => ({
        url: '/orders',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const orders = response.data?.orders || [];
        return orders.map((o: any) => ({
          id: o._id,
          reference: o.reference,
          placedOn: o.createdAt,
          status: o.status,
          paymentStatus: o.paymentStatus,
          paymentMode: o.paymentMode,
          lines: (o.lines || []).map((line: any) => ({
            productId: line.productId,
            name: line.name,
            image: line.image,
            quantity: line.quantity,
            unit: line.unit,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
            specifications: line.specifications || {},
          })),
          subtotal: o.subtotal,
          tax: o.tax,
          shipping: o.shipping,
          total: o.total,
          pickupAddress: o.pickupAddress,
          deliveryAddress: o.deliveryAddress,
          invoiceNo: o.invoiceNo,
          gatePassNo: o.gatePassNo,
          trackingTimeline: o.trackingTimeline || [],
          customerName: o.customerName,
          companyName: o.companyName,
          customerPhone: o.customerPhone,
          customerCity: o.customerCity,
          cancellationReason: o.cancellationReason,
          quotedPrices: o.quotedPrices,
          quotedShipping: o.quotedShipping,
          executiveId: o.executiveId || null,
        }));
      },
      providesTags: ['Order'],
    }),
    getOrder: build.query<Order | undefined, string>({
      query: (id) => ({
        url: `/orders/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const o = response.data;
        if (!o) return undefined;
        return {
          id: o._id,
          reference: o.reference,
          placedOn: o.createdAt,
          status: o.status,
          paymentStatus: o.paymentStatus,
          paymentMode: o.paymentMode,
          lines: (o.lines || []).map((line: any) => ({
            productId: line.productId,
            name: line.name,
            image: line.image,
            quantity: line.quantity,
            unit: line.unit,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
            specifications: line.specifications || {},
          })),
          subtotal: o.subtotal,
          tax: o.tax,
          shipping: o.shipping,
          total: o.total,
          pickupAddress: o.pickupAddress,
          deliveryAddress: o.deliveryAddress,
          invoiceNo: o.invoiceNo,
          gatePassNo: o.gatePassNo,
          trackingTimeline: o.trackingTimeline || [],
        };
      },
      providesTags: ['Order'],
    }),
    getTransactions: build.query<Transaction[], void>({
      query: () => ({
        url: '/payments/transactions',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const txs = response.data?.transactions || [];
        return txs.map((t: any) => ({
          id: t._id,
          orderRef: t.orderRef,
          amount: t.amount,
          mode: t.mode,
          date: t.createdAt,
          status: t.status,
        }));
      },
    }),
    getDocuments: build.query<BusinessDocument[], void>({
      query: () => ({
        url: '/users/me/documents',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const docs = response.data || [];
        return docs.map((d: any) => ({
          id: d.id,
          type: d.type,
          name: d.name,
          fileName: d.fileName || '',
          fileUrl: d.fileUrl || '',
          status: d.status,
          uploadedOn: d.uploadedOn,
        }));
      },
      providesTags: ['Document'],
    }),

    // ── Admin ────────────────────────────────────────────────────────────────
    getDashboardStats: build.query<DashboardStats, void>({
      query: () => ({
        url: '/reports/dashboard-stats',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const stats = response.data || {};
        const currentMonthIdx = new Date().getMonth();
        const currentMonthSales = stats.monthlySales?.[currentMonthIdx]?.sales || 0;
        return {
          totalRevenue: stats.totalRevenue || 0,
          revenueDelta: stats.revenueDelta || 0,
          totalOrders: stats.orderCount || 0,
          ordersDelta: stats.ordersDelta || 0,
          totalUsers: stats.userCount || 0,
          usersDelta: stats.usersDelta || 0,
          pendingPayments: stats.pendingOfflinePayments || 0,
          pendingPaymentsAmount: stats.pendingPaymentsAmount || 0,
          activeManagers: stats.activeManagers || 0,
          activeExecutives: stats.activeExecutives || 0,
          productStock: stats.productStock || 0,
          monthlySales: currentMonthSales,
          monthlySalesDelta: stats.monthlySalesDelta || 0,
        };
      },
    }),
    getSalesSeries: build.query<SalesPoint[], void>({
      query: () => ({
        url: '/reports/sales-series',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const data = response.data || [];
        return data.map((item: any) => ({
          label: item.label,
          revenue: item.revenue || 0,
          orders: item.count || 0,
          purchased: item.purchased || 0,
          onArrival: item.onArrival || 0,
        }));
      },
    }),
    getCategorySales: build.query<CategorySales[], void>({
      query: () => ({
        url: '/reports/category-sales',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const data = response.data || [];
        return data.map((item: any) => ({
          name: item.category || 'General',
          value: item.salesAmount || 0,
        }));
      },
    }),
    getAdminUsers: build.query<AdminUser[], void>({
      query: () => ({
        url: '/users/admin/list',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const users = response.data?.users || [];
        return users.map((u: any) => ({
          role: u.role || 'customer',
          id: u._id,
          name: u.name || '',
          company: u.companyName || u.name || '',
          email: u.email || '',
          mobile: u.mobile || '',
          city: u.city || '',
          joinedOn: u.createdAt || new Date().toISOString(),
          status: u.status || 'active',
          ordersCount: u.ordersCount || 0,
          totalSpend: u.totalSpend || 0,
          docStatus: u.kycVerified ? 'verified' : 'pending',
        }));
      },
      providesTags: ['AdminUser'],
    }),
    getAdminUserDocuments: build.query<BusinessDocument[], string>({
      query: (userId) => ({
        url: `/users/admin/${userId}/documents`,
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data || [],
      providesTags: ['Document'],
    }),
    getManagers: build.query<ManagerRow[], void>({
      query: () => ({
        url: '/users/admin/sales/managers',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const managers = response.data || [];
        return managers.map((m: any) => ({
          id: m._id,
          name: m.name || '',
          email: m.email || '',
          region: m.region || '',
          teamSize: m.teamSize || 0,
          revenue: m.revenue || 0,
          target: m.target || 0,
          status: m.status || 'active',
        }));
      },
      providesTags: ['Manager'],
    }),
    createManager: build.mutation<any, any>({
      query: (body) => ({
        url: '/users/admin/sales/managers',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['Manager'],
    }),
    getSalesSettings: build.query<{ commission: number; override: number; gstRate: number; shippingThreshold: number; baseShipping: number }, void>({
      query: () => ({
        url: '/users/admin/sales/settings',
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data || { commission: 5, override: 2, gstRate: 5, shippingThreshold: 50000, baseShipping: 1500 },
      providesTags: ['SalesSetting'],
    }),
    updateSalesSettings: build.mutation<any, { commission?: number; override?: number; gstRate?: number; shippingThreshold?: number; baseShipping?: number }>({
      query: (body) => ({
        url: '/users/admin/sales/settings',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['SalesSetting'],
    }),
    getExecutiveApprovals: build.query<ExecutiveApproval[], void>({
      query: () => ({
        url: '/users/admin/sales/executive-approvals',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const executives = response.data || [];
        return executives.map((u: any) => {
          let status: 'pending' | 'approved' | 'rejected' = 'pending';
          if (u.status === 'active') status = 'approved';
          else if (u.status === 'blocked') status = 'rejected';
          return {
            id: u._id,
            name: u.name || '',
            manager: u.managerId?.name || u.managerId || 'Unassigned',
            region: u.region || '',
            requestedOn: u.createdAt || new Date().toISOString(),
            status,
            aadharUrl: u.aadhaarUrl || '',
            panUrl: u.panUrl || '',
          };
        });
      },
      providesTags: ['Executive'],
    }),
    getAdminExecutives: build.query<any[], void>({
      query: () => ({
        url: '/users/admin/sales/executives',
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data || [],
      providesTags: ['Executive'],
    }),
    updateUserTarget: build.mutation<any, { userId: string; target: number }>({
      query: ({ userId, target }) => ({
        url: `/users/admin/sales/users/${userId}/target`,
        method: 'PATCH',
        data: { target },
      }),
      invalidatesTags: ['Executive', 'Manager'],
    }),
    approveExecutive: build.mutation<any, { id: string; status: 'active' | 'blocked' }>({
      query: ({ id, status }) => ({
        url: `/users/admin/sales/executive-approvals/${id}`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Executive', 'Manager'],
    }),
    assignManager: build.mutation<any, { executiveId: string; managerId: string }>({
      query: ({ executiveId, managerId }) => ({
        url: `/users/admin/sales/executives/${executiveId}/assign-manager`,
        method: 'PATCH',
        body: { managerId },
      }),
      invalidatesTags: ['Executive', 'Manager'],
    }),

    getStockRequests: build.query<StockRequest[], void>({
      query: () => ({
        url: '/inventory/stock-requests',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const requests = response.data?.stockRequests || [];
        return requests.map((sr: any) => ({
          id: sr._id,
          productName: sr.productName || '',
          category: sr.category || '',
          manager: sr.requesterId?.name || 'Unknown',
          type: sr.type || 'add',
          currentStock: sr.currentStock || 0,
          requestedChange: sr.requestedChange || 0,
          requestedOn: sr.createdAt || new Date().toISOString(),
          status: sr.status || 'pending',
          notes: sr.notes || '',
          sizeVariants: sr.sizeVariants || [],
          specifications: sr.specifications || {},
          origin: sr.origin || '',
          leadTimeDays: sr.leadTimeDays || 0,
        }));
      },
      providesTags: ['StockRequest'],
    }),

    // ── Sales (Manager + Executive) ───────────────────────────────────────────
    getManagerStats: build.query<SalesStats, void>({
      query: () => ({
        url: '/sales/manager/stats',
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data || {},
    }),
    getExecutiveStats: build.query<SalesStats, void>({
      query: () => ({
        url: '/sales/executive/stats',
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data || {},
    }),
    getExecutives: build.query<Executive[], void>({
      query: () => ({
        url: '/sales/manager/executives',
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data || [],
    }),
    getCrmCustomers: build.query<CRMCustomer[], void>({
      query: () => ({
        url: '/crm/customers',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const data = response.data || []
        return data.map((c: any) => ({
          id: c._id || c.id,
          name: c.name,
          company: c.company,
          phone: c.phone,
          city: c.city,
          stage: c.stage,
          value: c.totalValue || c.value || 0,
          lastContact: c.lastContactAt || c.lastContact || '',
          owner: c.owner || '',
          gst: c.gst,
          platformUserId: c.platformUserId || undefined,
        }))
      },
      providesTags: ['CrmCustomer'],
    }),
    getFollowUps: build.query<FollowUp[], void>({
      query: () => ({
        url: '/crm/follow-ups',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const data = response.data || [];
        return data.map((f: any) => ({
          id: f._id,
          customer: f.customer || '',
          company: f.company || '',
          dueOn: f.dueAt || new Date().toISOString(),
          type: f.type || 'call',
          note: f.note || '',
          done: !!f.isDone,
        }));
      },
      providesTags: ['FollowUp'],
    }),
    createCrmCustomer: build.mutation<any, Omit<CRMCustomer, 'id' | 'value' | 'lastContact' | 'stage' | 'owner'>>({
      query: (body) => ({
        url: '/crm/customers',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['CrmCustomer'],
    }),
    updateCrmCustomer: build.mutation<any, { id: string; patch: Partial<CRMCustomer> }>({
      query: ({ id, patch }) => ({
        url: `/crm/customers/${id}`,
        method: 'PATCH',
        data: patch,
      }),
      invalidatesTags: ['CrmCustomer'],
    }),
    createFollowUp: build.mutation<any, { crmCustomerId: string; dueAt: string; type: string; note?: string }>({
      query: (body) => ({
        url: '/crm/follow-ups',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['FollowUp', 'CrmCustomer'],
    }),
    updateFollowUp: build.mutation<any, { id: string; isDone?: boolean; note?: string }>({
      query: ({ id, ...body }) => ({
        url: `/crm/follow-ups/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: ['FollowUp', 'CrmCustomer'],
    }),
    deleteFollowUp: build.mutation<any, string>({
      query: (id) => ({
        url: `/crm/follow-ups/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FollowUp', 'CrmCustomer'],
    }),
    getSalesRecords: build.query<SaleRecord[], void>({
      query: () => ({
        url: '/sales/executive/records',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const data = response.data || [];
        return data.map((s: any) => ({
          id: s._id,
          ref: s.ref || '',
          customer: s.customer || '',
          product: s.product || '',
          quantity: s.quantity || 0,
          unit: s.unit || 'kg',
          amount: s.amount || 0,
          date: s.date || new Date().toISOString(),
          paymentStatus: s.paymentStatus || 'pending',
          by: 'Executive',
        }));
      },
    }),
    getVendorPurchases: build.query<VendorPurchase[], void>({
      query: () => ({
        url: '/inventory/vendor-purchases',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        const data = response.data?.purchases || [];
        return data.map((v: any) => ({
          id: v._id,
          vendor: v.vendorName || '',
          product: v.productName || '',
          brand: v.brand || '',
          quantity: v.quantity || 0,
          unit: v.unit || 'pcs',
          buyPrice: v.buyPrice || 0,
          total: v.total || 0,
          date: v.purchaseDate || new Date().toISOString(),
          status: v.status || 'pending',
          purchaser: v.purchasedBy?.name || 'Unknown',
          notes: v.notes || '',
          sizeVariants: v.sizeVariants || [],
          specifications: v.specifications || {},
          origin: v.origin || '',
          leadTimeDays: v.leadTimeDays || 0,
        }));
      },
    }),
    getIncentiveSeries: build.query<IncentivePoint[], void>({
      query: () => ({
        url: '/sales/executive/incentives',
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data || [],
    }),
    sendOtp: build.mutation<{ mobile: string; message: string }, { mobile: string; purpose: string }>({
      query: (body) => ({
        url: '/auth/send-otp',
        method: 'POST',
        body,
      }),
    }),
    verifyOtp: build.mutation<any, { mobile: string; otpCode: string; purpose: string }>({
      query: (body) => ({
        url: '/auth/verify-otp',
        method: 'POST',
        body,
      }),
    }),
    signupCustomer: build.mutation<any, any>({
      query: (body) => ({
        url: '/auth/signup/customer',
        method: 'POST',
        body,
      }),
    }),
    signupExecutive: build.mutation<any, FormData>({
      query: (body) => ({
        url: '/auth/signup/executive',
        method: 'POST',
        body,
      }),
    }),
    login: build.mutation<any, any>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
    }),
    forgotPassword: build.mutation<{ message: string }, { identifier: string }>({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),
    resetPassword: build.mutation<{ message: string }, { token: string; password: string }>({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),
    createOrder: build.mutation<any, any>({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Order', 'Product'],
    }),
    quoteOrder: build.mutation<any, { id: string; status: string; quotedPrices?: Record<string, number>; quotedShipping?: number; reason?: string }>({
      query: ({ id, ...body }) => ({
        url: `/orders/${id}/quote`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Order'],
    }),
    updateProfile: build.mutation<any, any>({
      query: (body) => ({
        url: '/users/me',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminUser'],
    }),
    uploadDocument: build.mutation<any, FormData>({
      query: (body) => ({
        url: '/users/me/documents',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Document'],
    }),
    updateOrderStatus: build.mutation<any, { id: string; status: string; reason?: string }>({
      query: ({ id, ...body }) => ({
        url: `/orders/admin/${id}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Order'],
    }),
    verifyPayment: build.mutation<any, { transactionId: string }>({
      query: ({ transactionId }) => ({
        url: `/payments/admin/${transactionId}/verify`,
        method: 'POST',
      }),
      invalidatesTags: ['Order'],
    }),
    updateUserStatus: build.mutation<any, { id: string; status: string }>({
      query: ({ id, ...body }) => ({
        url: `/users/admin/${id}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminUser'],
    }),
    verifyUserKyc: build.mutation<any, { id: string; kycVerified: boolean }>({
      query: ({ id, ...body }) => ({
        url: `/users/admin/${id}/kyc`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminUser'],
    }),
    updateStockRequest: build.mutation<any, { id: string; status: 'approved' | 'rejected'; rejectionReason?: string }>({
      query: ({ id, ...body }) => ({
        url: `/inventory/stock-requests/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['StockRequest', 'Product'],
    }),
    createCategory: build.mutation<any, { name: string; image?: string; order?: number }>({
      query: (body) => ({
        url: '/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Category'],
    }),
    deleteCategory: build.mutation<any, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: build.mutation<any, { id: string; name?: string; isActive?: boolean }>({
      query: ({ id, ...body }) => ({
        url: `/categories/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Category'],
    }),
    createProduct: build.mutation<any, any>({
      query: (body) => ({
        url: '/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    createVendorPurchase: build.mutation<any, any>({
      query: (body) => ({
        url: '/inventory/vendor-purchases',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    createStockRequest: build.mutation<any, any>({
      query: (body) => ({
        url: '/inventory/stock-requests',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['StockRequest', 'Product'],
    }),
    updateProduct: build.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    deleteProduct: build.mutation<any, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),
    getStorefront: build.query<{ hero: HeroContent; banners: Banner[]; trustBadges: TrustBadge[] }, void>({
      query: () => ({
        url: '/storefront',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        return response.data;
      },
      providesTags: ['Storefront'],
    }),
    updateStorefrontHero: build.mutation<any, Partial<HeroContent>>({
      query: (body) => ({
        url: '/storefront/hero',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Storefront'],
    }),
    updateStorefrontTrustBadges: build.mutation<any, { trustBadges: TrustBadge[] }>({
      query: (body) => ({
        url: '/storefront/trust-badges',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Storefront'],
    }),
    addStorefrontBanner: build.mutation<any, Omit<Banner, 'id'>>({
      query: (body) => ({
        url: '/storefront/banners',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Storefront'],
    }),
    updateStorefrontBanner: build.mutation<any, { id: string; banner: Partial<Banner> }>({
      query: ({ id, banner }) => ({
        url: `/storefront/banners/${id}`,
        method: 'PUT',
        body: banner,
      }),
      invalidatesTags: ['Storefront'],
    }),
    deleteStorefrontBanner: build.mutation<any, string>({
      query: (id) => ({
        url: `/storefront/banners/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Storefront'],
    }),
    getNotifications: build.query<{ notifications: InAppNotification[] }, void>({
      query: () => ({
        url: '/notifications',
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data,
      providesTags: ['Notification'],
    }),
    markNotificationRead: build.mutation<InAppNotification, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsRead: build.mutation<any, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
})

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useGetCategoriesQuery,
  useGetBannersQuery,
  useGetOrdersQuery,
  useGetOrderQuery,
  useGetTransactionsQuery,
  useGetDocumentsQuery,
  useGetDashboardStatsQuery,
  useGetSalesSeriesQuery,
  useGetCategorySalesQuery,
  useGetAdminUsersQuery,
  useGetAdminUserDocumentsQuery,
  useGetManagersQuery,
  useCreateManagerMutation,
  useGetSalesSettingsQuery,
  useUpdateSalesSettingsMutation,
  useGetExecutiveApprovalsQuery,
  useGetAdminExecutivesQuery,
  useUpdateUserTargetMutation,
  useApproveExecutiveMutation,
  useAssignManagerMutation,
  useGetStockRequestsQuery,
  useGetManagerStatsQuery,
  useGetExecutiveStatsQuery,
  useGetExecutivesQuery,
  useGetCrmCustomersQuery,
  useGetFollowUpsQuery,
  useGetSalesRecordsQuery,
  useGetVendorPurchasesQuery,
  useGetIncentiveSeriesQuery,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useSignupCustomerMutation,
  useSignupExecutiveMutation,
  useLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useCreateOrderMutation,
  useUpdateProfileMutation,
  useUploadDocumentMutation,
  useUpdateOrderStatusMutation,
  useVerifyPaymentMutation,
  useUpdateUserStatusMutation,
  useVerifyUserKycMutation,
  useUpdateStockRequestMutation,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateVendorPurchaseMutation,
  useCreateStockRequestMutation,
  useGetStorefrontQuery,
  useUpdateStorefrontHeroMutation,
  useUpdateStorefrontTrustBadgesMutation,
  useAddStorefrontBannerMutation,
  useUpdateStorefrontBannerMutation,
  useDeleteStorefrontBannerMutation,
  useCreateCrmCustomerMutation,
  useUpdateCrmCustomerMutation,
  useCreateFollowUpMutation,
  useUpdateFollowUpMutation,
  useDeleteFollowUpMutation,
  useQuoteOrderMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = api
