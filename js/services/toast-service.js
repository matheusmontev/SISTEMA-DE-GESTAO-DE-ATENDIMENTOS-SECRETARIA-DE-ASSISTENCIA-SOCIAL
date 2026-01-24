/**
 * Toast Service for modern non-blocking notifications
 */
export const ToastService = {
    init() {
        if (document.getElementById('toast-container')) return;
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    },

    show(message, type = 'success', duration = 4000) {
        this.init();
        const container = document.getElementById('toast-container');

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} fade-in-right`;

        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-exclamation-octagon-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };

        toast.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; padding: 1rem 1.25rem; min-width: 300px; background: white; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); border-left: 6px solid var(--${type === 'info' ? 'primary' : type}); pointer-events: auto;">
                <i class="bi ${icons[type]}" style="font-size: 1.25rem; color: var(--${type === 'info' ? 'primary' : type})"></i>
                <div style="flex:1;">
                    <div style="font-weight: 600; font-size: 0.9rem; color: #1e293b;">${type.toUpperCase()}</div>
                    <div style="font-size: 0.85rem; color: #64748b;">${message}</div>
                </div>
                <button type="button" style="background:none; border:none; color: #94a3b8; cursor:pointer; font-size:1.2rem; padding:0; line-height:1;">&times;</button>
            </div>
        `;

        container.appendChild(toast);

        const removeToast = () => {
            toast.classList.add('fade-out-right');
            setTimeout(() => toast.remove(), 400);
        };

        toast.querySelector('button').onclick = removeToast;
        setTimeout(removeToast, duration);
    }
};
