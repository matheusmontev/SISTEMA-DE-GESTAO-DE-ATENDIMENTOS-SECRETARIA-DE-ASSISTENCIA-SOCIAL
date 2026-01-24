/**
 * Toast & Custom Confirmation Service for modern non-blocking notifications
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

        // Add styles for the confirm modal if they don't exist
        if (!document.getElementById('confirm-styles')) {
            const style = document.createElement('style');
            style.id = 'confirm-styles';
            style.innerHTML = `
                .modal-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 10000; animation: fadeIn 0.2s ease-out;
                }
                .confirm-card {
                    background: white; padding: 2rem; border-radius: 12px;
                    width: 90%; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
                    text-align: center; animation: slideUp 0.3s ease-out;
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
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
    },

    confirm(title, message, confirmBtnText = "Confirmar", cancelBtnText = "Cancelar") {
        this.init();
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="confirm-card">
                    <div style="font-size: 3rem; color: var(--warning); margin-bottom: 1rem;">
                        <i class="bi bi-question-circle"></i>
                    </div>
                    <h3 style="margin-bottom: 0.5rem; color: #1e293b;">${title}</h3>
                    <p style="color: #64748b; margin-bottom: 2rem;">${message}</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="modal-cancel" class="btn btn-secondary" style="flex:1;">${cancelBtnText}</button>
                        <button id="modal-confirm" class="btn btn-primary" style="flex:1;">${confirmBtnText}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            document.getElementById('modal-cancel').onclick = () => {
                overlay.remove();
                resolve(false);
            };
            document.getElementById('modal-confirm').onclick = () => {
                overlay.remove();
                resolve(true);
            };
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve(false);
                }
            };
        });
    }
};
