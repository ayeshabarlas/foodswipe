import dynamic from 'next/dynamic';

const RestaurantDashboard = dynamic(() => import('../../components/RestaurantDashboard'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
    )
});

export default function RestaurantPage() {
    return <RestaurantDashboard />;
}
