export type OrderStatus = "received" | "approved" | "rejected" | "preparing" | "ready" | "delivering" | "completed";

export type OrderLineView = {
  id: string;
  productName: string;
  unitPriceOre: number;
  quantity: number;
  note: string;
  options: Array<{ name: string; priceDeltaOre: number }>;
};

export type OrderView = {
  orderNumber: string;
  token?: string;
  placement: "bane" | "klubhus" | "terrasse";
  locationDetail: string;
  status: OrderStatus;
  totalOre: number;
  requestedFor: string;
  approvedFor?: string;
  createdAt: string;
  items: OrderLineView[];
};
