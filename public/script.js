// 处理导航栏响应式菜单
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// 平滑滚动到锚点
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
            // 如果导航菜单是打开的，点击后关闭它
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                hamburger.classList.remove('active');
            }
        }
    });
});

// 添加页面滚动效果
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    } else {
        navbar.style.backgroundColor = 'var(--white)';
    }
});

// 添加页面加载动画
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// 为作品集添加图片加载效果
const portfolioImages = document.querySelectorAll('.portfolio-item img');
portfolioImages.forEach(img => {
    img.addEventListener('load', function() {
        this.style.opacity = '1';
    });
});

// --- Hero Carousel --- 
const heroSection = document.getElementById('home');
let carouselImages = [];
let currentImageIndex = 0;
let intervalId = null;

async function setupHeroCarousel() {
    try {
        const response = await fetch('/api/carousel-images');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        carouselImages = await response.json();

        if (carouselImages.length === 0) {
            console.warn("No carousel images found. Displaying default or empty background.");
            // Optionally set a default background if no images are uploaded
            // heroSection.style.backgroundColor = '#2c3e50'; // Example default
            return; 
        }

        // Preload images (optional but good practice)
        carouselImages.forEach(imgData => {
            const img = new Image();
            img.src = imgData.path;
        });

        // Create image elements
        carouselImages.forEach((imgData, index) => {
            const div = document.createElement('div');
            div.classList.add('hero-background-image');
            div.style.backgroundImage = `url('${imgData.path}')`;
            div.dataset.index = index; // Store index for reference
            if (index === 0) {
                div.classList.add('active'); // Show the first image initially
            }
            heroSection.insertBefore(div, heroSection.firstChild); // Insert before overlay/content
        });

        startCarousel();

    } catch (error) {
        console.error('Failed to setup hero carousel:', error);
        // Handle error display if needed
    }
}

function showNextImage() {
    const imageElements = heroSection.querySelectorAll('.hero-background-image');
    if (imageElements.length < 2) return; // No need to rotate if less than 2 images

    imageElements[currentImageIndex].classList.remove('active');
    currentImageIndex = (currentImageIndex + 1) % imageElements.length;
    imageElements[currentImageIndex].classList.add('active');
}

function startCarousel() {
    stopCarousel(); // Clear existing interval if any
    if (carouselImages.length > 1) {
        intervalId = setInterval(showNextImage, 5000); // Change image every 5 seconds
    }
}

function stopCarousel() {
    clearInterval(intervalId);
}

// Call setup function when the page loads
document.addEventListener('DOMContentLoaded', setupHeroCarousel);

// --- End Hero Carousel --- 

// --- Load Services Dynamically ---
const servicesGridContainer = document.getElementById('services-grid-container');

async function loadServices() {
    if (!servicesGridContainer) return; // Exit if container not found

    try {
        const response = await fetch('/api/services');
        if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status}`);
        }
        const services = await response.json();

        servicesGridContainer.innerHTML = ''; // Clear placeholder or old content

        if (services.length === 0) {
             servicesGridContainer.innerHTML = '<p>暂无服务项目。</p>';
             return;
        }

        services.forEach(service => {
            const card = document.createElement('div');
            card.classList.add('service-card');

            const imageElement = service.image_path 
                ? `<img src="${service.image_path}" alt="${escapeHTML(service.title)}" class="service-image">`
                : '<div class="service-image-placeholder"></div>'; // Placeholder if no image

            card.innerHTML = `
                ${imageElement}
                <h3>${escapeHTML(service.title)}</h3>
                <p>${escapeHTML(service.description)}</p>
            `;
            servicesGridContainer.appendChild(card);
        });

    } catch (error) {
        console.error('Failed to load services:', error);
        if (servicesGridContainer) {
             servicesGridContainer.innerHTML = '<p style="color: red;">加载服务项目失败。</p>';
        }
    }
}

// Utility to escape HTML (Important for security)
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// --- Load About Content Dynamically ---
async function loadAboutContent() {
    const p1Element = document.getElementById('about-p1');
    const p2Element = document.getElementById('about-p2');
    const yearsElement = document.getElementById('stat-years');
    const projectsElement = document.getElementById('stat-projects');
    const teamElement = document.getElementById('stat-team');

    // Exit if any element is not found
    if (!p1Element || !p2Element || !yearsElement || !projectsElement || !teamElement) {
        console.warn('One or more About Us elements not found in the DOM.');
        return;
    }

    try {
        const response = await fetch('/api/about');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Populate the elements, use empty string as fallback
        p1Element.textContent = data.paragraph1 || '';
        p2Element.textContent = data.paragraph2 || '';
        yearsElement.textContent = data.stat_years || '0'; // Use '0' or similar as fallback for stats
        projectsElement.textContent = data.stat_projects || '0';
        teamElement.textContent = data.stat_team || '0';

    } catch (error) {
        console.error('Failed to load about content:', error);
        // Optionally display an error message in the about section
        const aboutTextDiv = document.querySelector('.about-text');
        if(aboutTextDiv) {
            aboutTextDiv.innerHTML = '<p style="color: red;">加载"关于我们"信息失败。</p>';
        }
    }
}

// --- Update DOMContentLoaded listener to call all load functions ---
document.addEventListener('DOMContentLoaded', () => {
    setupHeroCarousel();
    loadServices();
    loadAboutContent(); // Add the call here
});

// --- End Load Services --- 