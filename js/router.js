export const Router = {
    contentContainer: null,

    init(containerId) {
        this.contentContainer = document.getElementById(containerId);
    },

    loadView(viewName, userData) {
        // Clear current content
        this.contentContainer.innerHTML = '<div class="text-center mt-3">Carregando...</div>';

        switch (viewName) {
            case 'admin-dashboard':
                import('./views/admin-view.js').then(module => module.render(this.contentContainer, userData));
                break;
            case 'reception-dashboard':
                import('./views/reception-view.js').then(module => module.render(this.contentContainer, userData));
                break;
            case 'sector-dashboard':
                import('./views/sector-view.js').then(module => module.render(this.contentContainer, userData));
                break;
            default:
                this.contentContainer.innerHTML = '<h1>Bem-vindo! Selecione uma opção.</h1>';
        }
    }
};
