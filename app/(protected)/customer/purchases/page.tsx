import CustomerOrderHistory from "@/components/customer-order-history";
export default function ProductPurchasesPage({searchParams}:{searchParams:Promise<{page?:string}>}){return <CustomerOrderHistory searchParams={searchParams} productsOnly/>;}
