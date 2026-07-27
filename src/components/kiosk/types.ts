export type KioskStep =
  | 'welcome'
  | 'service-type'
  | 'catalog'
  | 'cart'
  | 'member'
  | 'payment'
  | 'qris'
  | 'success';

export type KioskServiceType =
  | 'dine-in'
  | 'takeaway';

export type KioskPaymentMethod =
  | 'cash'
  | 'qris';

export type KioskCategory = {
  id: string;
  name: string;
  slug?: string;
};

export type KioskAddOn = {
  id: number;
  name: string;
  price: number;
};

export type KioskAddOnGroup = {
  categoryName: string;
  maxSelected: number;
  isRequired: boolean;
  addOns: KioskAddOn[];
};

export type KioskProduct = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  isAvailable?: boolean;
  stock?: number | null;
  addOnGroups?: KioskAddOnGroup[];
};

export type KioskCartItem = {
  lineId: string;
  productId: string;
  name: string;
  imageUrl?: string | null;
  quantity: number;
  basePrice: number;
  addOns: KioskAddOn[];
  notes?: string;
};

export type KioskPromo = {
  id: number;
  title: string;
  description: string | null;
  couponCode: string;
  discountRate: number;
  discountPrice: number;
  isMemberOnly: boolean;
  startDate: string | null;
  expiredDate: string | null;
};

export type KioskQrisData = {
  transactionId: string;
  qrUrl: string;
  qrString?: string | null;
  expiryTime?: string | null;
};


export type KioskCustomer = {
  type:
    | 'member'
    | 'guest';
  userId: number | null;
  name: string;
  email: string;
  phone: string | null;
  memberId: string | null;
};
