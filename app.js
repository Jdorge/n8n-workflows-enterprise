// app.js - Client-side entry point for n8n Enterprise Workflows
// This file runs in the browser and initializes Vercel Analytics

import { inject } from '@vercel/analytics';

// Initialize Vercel Web Analytics
// Note: inject() must run on the client side
inject();

console.log('Vercel Web Analytics initialized successfully');

// Add interactive features for the page
document.addEventListener('DOMContentLoaded', () => {
    console.log('n8n Enterprise Workflows - Ready');
    
    // Add click tracking for workflow items
    const workflowItems = document.querySelectorAll('.workflow-item');
    workflowItems.forEach(item => {
        item.addEventListener('click', () => {
            const workflowName = item.querySelector('.workflow-name').textContent;
            console.log('Workflow clicked:', workflowName);
        });
    });

    // Add hover effects
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
            card.style.transition = 'transform 0.2s';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
});
