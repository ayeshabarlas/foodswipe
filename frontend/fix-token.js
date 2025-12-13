// Quick fix script for token storage
// Run this in browser console after login to manually fix token storage

const fixTokenStorage = () => {
    const userInfo = localStorage.getItem('userInfo');
    const token = localStorage.getItem('token');

    if (userInfo && token) {
        try {
            const parsed = JSON.parse(userInfo);
            if (!parsed.token) {
                // Add token to userInfo
                parsed.token = token;
                localStorage.setItem('userInfo', JSON.stringify(parsed));
                console.log('✅ Token added to userInfo');
            } else {
                console.log('✅ Token already in userInfo');
            }
        } catch (e) {
            console.error('Error fixing token:', e);
        }
    } else {
        console.log('❌ Missing userInfo or token');
    }
};

fixTokenStorage();
