import { FichaService } from '../services/ficha-service.js';
import { ToastService } from '../services/toast-service.js';

export async function render(container, user) {
    container.innerHTML = `
        <div class="fade-in">
            <h2 class="mb-4"><i class="bi bi-person-plus-fill me-2" style="color:var(--primary);"></i> Recepção - Atendimento Inicial</h2>
            
            <div style="max-width: 800px; margin: 0 auto;">
                <!-- Form Card -->
                <div class="card">
                    <h3 class="mb-4" style="font-size: 1.25rem;"><i class="bi bi-file-earmark-text me-2"></i> Nova Ficha de Atendimento</h3>
                    <form id="fichaForm">
                        <div class="form-group">
                            <label class="form-label">CPF do Cidadão</label>
                            <div style="display: flex; gap: 10px;">
                                <div style="position:relative; flex:1;">
                                    <i class="bi bi-person-badge" style="position:absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"></i>
                                    <input type="text" id="citizenCPF" class="form-control" placeholder="000.000.000-00" required style="padding-left: 35px;">
                                </div>
                                <button type="button" id="btnSearchCPF" class="btn btn-primary" title="Buscar dados anteriores" style="padding: 0.625rem 1rem;">
                                    <i class="bi bi-search"></i>
                                </button>
                            </div>
                            <small class="text-secondary" id="cpfFeedback" style="display:block; margin-top:0.25rem; font-size:0.75rem;">Formato: xxx.xxx.xxx-xx</small>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Nome Completo</label>
                            <input type="text" id="citizenName" class="form-control" placeholder="Nome do cidadão..." required>
                        </div>

                        <div class="row" style="display:flex; gap:1rem;">
                            <div style="flex:1;">
                                <label class="form-label">Bairro</label>
                                <input type="text" id="addressNeighborhood" class="form-control" placeholder="Bairro" required>
                            </div>
                            <div style="flex:2;">
                                <label class="form-label">Rua/Endereço</label>
                                <input type="text" id="addressStreet" class="form-control" placeholder="Logradouro e número..." required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Encaminhar para Setor</label>
                            <select id="targetSector" class="form-control" required>
                                <option value="">Selecione o setor de destino...</option>
                                <option value="bolsa_familia">Bolsa Família</option>
                                <option value="crianca_feliz">Criança Feliz</option>
                                <option value="psicologia">Psicologia</option>
                                <option value="assistencia_social">Assistência Social</option>
                                <option value="loas">LOAS</option>
                                <option value="anexo_cras">Anexo do CRAS</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Assunto / Solicitação (Demanda Inicial)</label>
                            <textarea id="subject" class="form-control" rows="3" required placeholder="Descreva brevemente o motivo da visita..."></textarea>
                        </div>

                        <button type="submit" class="btn btn-primary w-100" style="padding: 0.75rem; font-size: 1rem; margin-top: 1rem;">
                            <i class="bi bi-check-circle-fill"></i> Criar Ficha de Atendimento
                        </button>
                    </form>
                </div>
            </div>
    `;

    // Mask for CPF Logic
    const cpfInput = document.getElementById('citizenCPF');
    cpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        e.target.value = value;
    });

    // Search CPF Logic
    document.getElementById('btnSearchCPF').addEventListener('click', async () => {
        const cpf = cpfInput.value;
        if (cpf.length < 14) {
            ToastService.show('Digite um CPF completo para buscar.', 'warning');
            return;
        }

        const btn = document.getElementById('btnSearchCPF');
        const originalText = btn.innerHTML;
        btn.innerHTML = '⌛';
        btn.disabled = true;

        try {
            const data = await FichaService.getLatestFicha(cpf);
            if (data) {
                document.getElementById('citizenName').value = data.citizenName || '';
                if (data.address) {
                    document.getElementById('addressNeighborhood').value = data.address.neighborhood || '';
                    document.getElementById('addressStreet').value = data.address.street || '';
                }
                ToastService.show('Dados encontrados! Campos preenchidos.');
            } else {
                ToastService.show('CPF não encontrado. Preencha manualmente.', 'info');
            }
        } catch (error) {
            console.error(error);
            ToastService.show('Erro ao buscar CPF.', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    const form = document.getElementById('fichaForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = form.querySelector('button[type="submit"]');
        const cpf = cpfInput.value;

        if (!FichaService.isValidCPF(cpf)) {
            ToastService.show("CPF inválido! Use o formato 000.000.000-00", "warning");
            return;
        }

        try {
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Salvando...';

            const fichaData = {
                citizenName: document.getElementById('citizenName').value,
                citizenCPF: cpf,
                address: {
                    neighborhood: document.getElementById('addressNeighborhood').value,
                    street: document.getElementById('addressStreet').value
                },
                targetSector: document.getElementById('targetSector').value,
                subject: document.getElementById('subject').value
            };

            await FichaService.createFicha(fichaData, user.name || user.email);
            ToastService.show("Ficha criada e encaminhada com sucesso!");

            // Clear form
            document.getElementById('fichaForm').reset();
            document.getElementById('citizenCPF').value = '';
        } catch (e) {
            ToastService.show("Erro ao criar ficha: " + e.message, 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-check-circle-fill"></i> Criar Ficha de Atendimento';
        }
    });
}
