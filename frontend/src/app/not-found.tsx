import Link from 'next/link';

export default function NotFound() {
    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100vh',
            fontFamily: 'sans-serif'
        }}>
            <h2>404 - Page Not Found</h2>
            <p>Could not find requested resource</p>
            <Link href="/" style={{ color: '#ff4d4d', textDecoration: 'underline' }}>
                Return Home
            </Link>
        </div>
    );
}
