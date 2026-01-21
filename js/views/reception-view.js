import { FichaService } from '../services/ficha-service.js';

export async function render(container, user) {
    container.innerHTML = `
        <h2>Recepção - Atendimento Inicial</h2>
        
        <div class="row" style="display: flex; gap: 20px; flex-wrap: wrap;">
            <!-- Form Card -->
            <div class="card" style="flex: 1; min-width: 300px;">
                <h3 class="mb-3">Nova Ficha de Atendimento</h3>
                <form id="fichaForm">
                    <!-- CPF First -->
                    <div class="form-group">
                        <label class="form-label">CPF do Cidadão</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="citizenCPF" class="form-control" placeholder="000.000.000-00" required>
                            <button type="button" id="btnSearchCPF" class="btn btn-secondary" title="Buscar dados anteriores">
                                🔍
                            </button>
                        </div>
                        <small style="color: grey;" id="cpfFeedback">Formato: xxx.xxx.xxx-xx</small>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Nome Completo</label>
                        <input type="text" id="citizenName" class="form-control" required>
                    </div>

                    <div class="form-group" style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label class="form-label">Bairro</label>
                            <input type="text" id="addressNeighborhood" class="form-control" required>
                        </div>
                        <div style="flex:2;">
                            <label class="form-label">Rua/Endereço</label>
                            <input type="text" id="addressStreet" class="form-control" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Encaminhar para Setor</label>
                        <select id="targetSector" class="form-control" required>
                            <option value="">Selecione...</option>
                            <option value="bolsa_familia">Bolsa Família</option>
                            <option value="crianca_feliz">Criança Feliz</option>
                            <option value="psicologia">Psicologia</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Assunto/Solicitação</label>
                        <textarea id="subject" class="form-control" rows="3" required placeholder="Ex: Atualização de cadastro, agendamento..."></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary" style="width: 100%;">Criar Ficha</button>
                </form>
            </div>

            <!-- Recent Fichas (Placeholder) -->
            <div class="card" style="flex: 1; min-width: 300px;">
                <h3>Últimos Atendimentos</h3>
                <p class="text-secondary">Seus registros recentes aparecerão aqui (Em breve).</p>
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
            alert('Digite um CPF completo para buscar.');
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
                alert('Dados encontrados! Campos preenchidos.');
            } else {
                alert('CPF não encontrado no sistema. Preencha os dados manualmente.');
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao buscar CPF.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    const form = document.getElementById('fichaForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        const cpf = cpfInput.value;

        if (!FichaService.isValidCPF(cpf)) {
            alert("CPF inválido! Use o formato 000.000.000-00");
            return;
        }

        try {
            btn.disabled = true;
            btn.textContent = 'Salvando...';

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

            alert('Ficha criada com sucesso!');
            form.reset();

        } catch (error) {
            alert('Erro: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Criar Ficha';
        }
    });
}
