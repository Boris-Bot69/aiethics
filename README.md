# AI Ethics Literacy - TUM

A modern, accessible web application for AI Ethics Literacy activities at TUM, translated from Streamlit to HTML/CSS/JavaScript.

## Overview

This website was funded and created through the "Co-designing a Risk-Assessment Dashboard for AI Ethics Literacy in EdTech" project. Our focus is to develop practical guidance for decision-makers to help them navigate through the process of ethical decision-making in applying AI EdTech.

## Features

### 🚀 **Modern Web Application**

- Translated from Streamlit to pure HTML/CSS/JavaScript
- Responsive three-column layout design
- Fixed navigation bar with smooth scrolling
- Interactive cards and hover effects

### 🎨 **Design & Layout**

- Three-column layout: left sidebar, main content, right sidebar
- Responsive grid system that adapts to different screen sizes
- Custom color scheme with green accents (#E1EBDD, #A0C3A0)
- Inter font family for modern typography

### 📱 **Responsive Design**

- Mobile-first responsive design
- Breakpoints at 1200px, 992px, 768px, and 480px
- Sidebars collapse on smaller screens
- Touch-friendly navigation

### ♿ **Accessibility Features**

- Semantic HTML structure
- Proper heading hierarchy
- Skip to main content link
- Keyboard navigation support
- Screen reader friendly markup

### 🔍 **Content Sections**

- **AI Ethics Definitions**: What is AI, AI ethics, and AI ethics literacy
- **Scenarios & Activities**: Interactive cards explaining AI ethics scenarios
- **OECD Principles**: Codebook and guiding questions
- **Publications**: Research papers and related work

## File Structure

```
AI_Ethics/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Main stylesheet
├── js/
│   └── main.js             # Main JavaScript file
├── images/                 # Image assets (create this directory)
│   ├── leftsidebar.svg
│   ├── leftsidebar_down.svg
│   ├── rightsidebar.svg
│   ├── rightsidebar_down.svg
│   ├── Rectangle_green.png
│   ├── OECD_Codebook.png
│   └── OECD_Guiding_Questions.png
└── README.md               # This file
```

## Required Images

To run this application, you'll need to create an `images/` directory with the following files:

- `leftsidebar.svg` - Left sidebar decoration
- `leftsidebar_down.svg` - Left sidebar bottom decoration
- `rightsidebar.svg` - Right sidebar decoration
- `rightsidebar_down.svg` - Right sidebar bottom decoration
- `Rectangle_green.png` - Green rectangle decoration images
- `OECD_Codebook.png` - OECD Codebook icon
- `OECD_Guiding_Questions.png` - OECD Guiding Questions icon

## Getting Started

1. **Create the images directory** and add the required image files
2. **Open `index.html`** in a modern web browser
3. **Customize content** as needed for your specific use case
4. **Deploy** to any web hosting service

## Navigation Structure

The application includes navigation to these sections:

- **TUM AI Ethics literacy activities** (Home)
- **AI Ethics Activities**
- **AI Ethics Scenarios**
- **OECD Principles**
- **Research**

## Customization

### Colors

The main color scheme uses:

- Primary green: `#E1EBDD`
- Accent green: `#A0C3A0`
- Red accent: `#FF6B6B`
- Text colors: `#222222`, `#333333`

### Layout

- Three-column grid layout using CSS Grid
- Responsive breakpoints for different screen sizes
- Sidebar images with max-height constraints

### Typography

- Inter font family (loaded from Google Fonts)
- Responsive font sizing
- Proper line heights for readability

## Browser Support

- **Modern browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile browsers**: iOS Safari 12+, Chrome Mobile 60+
- **Fallbacks**: Graceful degradation for older browsers

## Performance Features

- **Optimized images** with proper sizing
- **CSS Grid** for efficient layouts
- **Minimal JavaScript** for fast loading
- **Responsive images** that scale appropriately

## Accessibility Checklist

- [x] Semantic HTML structure
- [x] Proper heading hierarchy (h1, h2, h3, h4)
- [x] Alt text for images
- [x] Keyboard navigation support
- [x] Skip navigation links
- [x] High contrast color scheme
- [x] Screen reader compatibility

## Responsive Breakpoints

- **1200px+**: Full three-column layout
- **992px-1199px**: Adjusted column proportions
- **768px-991px**: Single column, sidebars hidden
- **480px-767px**: Mobile-optimized navigation
- **<480px**: Compact mobile layout

## Deployment

1. **Prepare images**: Ensure all required images are in the `images/` directory
2. **Test locally**: Open `index.html` in different browsers and devices
3. **Upload files**: Deploy all files to your web hosting service
4. **Configure domain**: Point your domain to the hosting location

## Browser Testing

Test your website across different browsers and devices:

- **Desktop**: Chrome, Firefox, Safari, Edge
- **Mobile**: iOS Safari, Chrome Mobile, Samsung Internet
- **Accessibility**: Screen readers, keyboard navigation, high contrast mode

## Contributing

Feel free to customize this application for your projects:

- Modify content and sections
- Adjust color schemes and typography
- Add new interactive features
- Enhance accessibility features

## License

This application is provided as-is for educational and commercial use. Feel free to modify and use in your projects.

## Support

For questions or issues:

1. Check the documentation
2. Review the code comments
3. Test in different browsers
4. Validate HTML and CSS

---

**Happy coding! 🎉**
