const dishes = [
    // Kolachi
    {
        name: 'Makhni Handi',
        description: 'Rich and creamy chicken handi cooked in butter.',
        price: 1200,
        videoUrl: 'https://videos.pexels.com/video-files/5903123/5903123-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800',
        category: 'Desi',
        likes: 150,
    },
    {
        name: 'Peshawari Karahi',
        description: 'Traditional mutton karahi with minimal spices.',
        price: 1800,
        videoUrl: 'https://videos.pexels.com/video-files/3298636/3298636-uhd_2560_1440_24fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
        category: 'Desi',
        likes: 120,
    },
    {
        name: 'Tandoori Naan',
        description: 'Fresh naan bread from tandoor.',
        price: 80,
        videoUrl: 'https://videos.pexels.com/video-files/4252950/4252950-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1619895092538-128341789043?w=800',
        category: 'Breads',
        likes: 90,
    },

    // Javed Nihari
    {
        name: 'Special Nihari',
        description: 'Slow-cooked beef stew with bone marrow.',
        price: 800,
        videoUrl: 'https://videos.pexels.com/video-files/4252938/4252938-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800',
        category: 'Desi',
        likes: 300,
    },
    {
        name: 'Paya',
        description: 'Traditional trotters curry.',
        price: 600,
        videoUrl: 'https://videos.pexels.com/video-files/3298879/3298879-uhd_2560_1440_24fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800',
        category: 'Desi',
        likes: 180,
    },

    // Savour Foods
    {
        name: 'Chicken Pulao Kabab',
        description: 'Famous Pulao with Shami Kabab and Raita.',
        price: 450,
        videoUrl: 'https://videos.pexels.com/video-files/4253312/4253312-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800',
        category: 'Rice',
        likes: 500,
    },
    {
        name: 'Chicken Biryani',
        description: 'Aromatic rice with spiced chicken.',
        price: 550,
        videoUrl: 'https://videos.pexels.com/video-files/5903475/5903475-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800',
        category: 'Rice',
        likes: 420,
    },

    // Monal
    {
        name: 'Cheese Naan',
        description: 'Fluffy naan stuffed with melted cheese.',
        price: 350,
        videoUrl: 'https://videos.pexels.com/video-files/7937571/7937571-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800',
        category: 'Breads',
        likes: 250,
    },
    {
        name: 'BBQ Platter',
        description: 'Assortment of Malai Boti, Seekh Kabab, and Tikka.',
        price: 2500,
        videoUrl: 'https://videos.pexels.com/video-files/4252938/4252938-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800',
        category: 'BBQ',
        likes: 400,
    },
    {
        name: 'Seekh Kabab',
        description: 'Minced meat kababs on skewers.',
        price: 800,
        videoUrl: 'https://videos.pexels.com/video-files/3195445/3195445-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800',
        category: 'BBQ',
        likes: 320,
    },

    // Butt Karahi
    {
        name: 'Desi Ghee Karahi',
        description: 'Chicken Karahi cooked in pure Desi Ghee.',
        price: 1500,
        videoUrl: 'https://videos.pexels.com/video-files/3298636/3298636-uhd_2560_1440_24fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800',
        category: 'Desi',
        likes: 350,
    },
    {
        name: 'Mutton Karahi',
        description: 'Tender mutton pieces in tomato gravy.',
        price: 1800,
        videoUrl: 'https://videos.pexels.com/video-files/5903123/5903123-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
        category: 'Desi',
        likes: 290,
    },

    // Haveli
    {
        name: 'Badshahi Tawa Chicken',
        description: 'Spicy chicken cooked on a large tawa.',
        price: 1100,
        videoUrl: 'https://videos.pexels.com/video-files/4252950/4252950-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800',
        category: 'Desi',
        likes: 200,
    },
    {
        name: 'Lahori Chargha',
        description: 'Whole fried chicken marinated in spices.',
        price: 1600,
        videoUrl: 'https://videos.pexels.com/video-files/4253312/4253312-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800',
        category: 'Desi',
        likes: 340,
    },

    // Ginyaki
    {
        name: 'Dragon Chicken',
        description: 'Crispy chicken tossed in spicy red sauce.',
        price: 950,
        videoUrl: 'https://videos.pexels.com/video-files/3298879/3298879-uhd_2560_1440_24fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800',
        category: 'Chinese',
        likes: 180,
    },
    {
        name: 'Szechuan Noodles',
        description: 'Spicy stir-fried noodles with vegetables.',
        price: 750,
        videoUrl: 'https://videos.pexels.com/video-files/5903475/5903475-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
        category: 'Chinese',
        likes: 210,
    },

    // Kababjees
    {
        name: 'Malai Boti',
        description: 'Creamy and tender boneless chicken bites.',
        price: 850,
        videoUrl: 'https://videos.pexels.com/video-files/7937571/7937571-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800',
        category: 'BBQ',
        likes: 220,
    },
    {
        name: 'Chicken Tikka',
        description: 'Grilled chicken pieces marinated in yogurt.',
        price: 700,
        videoUrl: 'https://videos.pexels.com/video-files/3195445/3195445-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800',
        category: 'BBQ',
        likes: 280,
    },

    // Salt'n Pepper
    {
        name: 'Stuffed Chicken Breast',
        description: 'Fried chicken breast stuffed with cheese and herbs.',
        price: 1050,
        videoUrl: 'https://videos.pexels.com/video-files/4252938/4252938-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800',
        category: 'Continental',
        likes: 160,
    },
    {
        name: 'Grilled Fish',
        description: 'Fresh fish fillet grilled to perfection.',
        price: 1200,
        videoUrl: 'https://videos.pexels.com/video-files/5903123/5903123-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
        category: 'Continental',
        likes: 195,
    },

    // Bundu Khan
    {
        name: 'Chicken Tikka',
        description: 'Classic spicy chicken leg piece.',
        price: 400,
        videoUrl: 'https://videos.pexels.com/video-files/4252950/4252950-uhd_2560_1440_25fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800',
        category: 'BBQ',
        likes: 300,
    },
    {
        name: 'Beef Seekh Kabab',
        description: 'Minced beef kababs with aromatic spices.',
        price: 500,
        videoUrl: 'https://videos.pexels.com/video-files/3298636/3298636-uhd_2560_1440_24fps.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800',
        category: 'BBQ',
        likes: 260,
    },
];

module.exports = dishes;
