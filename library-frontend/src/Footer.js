import React from 'react';

function Footer() {
    // Automatically gets the current year
    const currentYear = new Date().getFullYear(); 
    
    return (
        <footer className="main-footer">
            &copy; {currentYear} Library Gateway Register. All Rights Reserved.
        </footer>
    );
}

export default Footer;