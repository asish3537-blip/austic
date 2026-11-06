import CustomerOrderHistory from "@/components/customer-order-history";
export default function OrdersPage({searchParams}:{searchParams:Promise<{page?:string}>}){return <CustomerOrderHistory searchParams={searchParams}/>;}
