import { db } from '../firebase-config.js';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function render(container, user) {
    container.innerHTML = `
        <div class="fade-in">
            <h2 class="mb-4"><i class="bi bi-search me-2" style="color:var(--primary);"></i> Busca Inteligente - Histórico por CPF</h2>
            <div class="card mb-4" style="background: radial-gradient(circle at top right, #fff, #f8fafc);">
                <p class="text-secondary mb-3">Consulte o histórico completo de um cidadão em todos os setores do sistema.</p>
                <div class="form-group" style="display: flex; gap: 1rem; max-width: 600px;">
                    <div style="position:relative; flex:1;">
                        <i class="bi bi-person-vcard" style="position:absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"></i>
                        <input type="text" id="searchCPF" class="form-control" placeholder="000.000.000-00" maxlength="14" style="padding-left: 35px;">
                    </div>
                    <button id="btnDoSearch" class="btn btn-primary" style="padding-left: 1.5rem; padding-right: 1.5rem;">
                        <i class="bi bi-search me-1"></i> Buscar
                    </button>
                </div>
            </div>

            <div id="searchResults">
                <!-- Dynamic Results -->
            </div>
        </div>
    `;

    const searchInput = document.getElementById('searchCPF');

    // Mask
    searchInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        e.target.value = value;
    });

    document.getElementById('btnDoSearch').addEventListener('click', () => {
        const cpf = searchInput.value;
        if (cpf.length < 14) {
            alert('Digite o CPF completo.');
            return;
        }
        performGlobalSearch(cpf);
    });

    async function performGlobalSearch(cpf) {
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.innerHTML = '<div class="text-center p-5 text-secondary"><i class="bi bi-arrow-repeat spin" style="font-size: 2rem;"></i><p class="mt-2">Buscando histórico completo...</p></div>';

        try {
            const q = query(collection(db, "fichas"), where("citizenCPF", "==", cpf));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                resultsDiv.innerHTML = `
                    <div class="card text-center p-5">
                        <i class="bi bi-person-exclamation" style="font-size: 3rem; color: var(--border-color);"></i>
                        <p class="mt-3 text-secondary">Nenhum registro encontrado para o CPF ${cpf}.</p>
                    </div>
                `;
                return;
            }

            let allFichas = [];
            querySnapshot.forEach(docSnap => {
                allFichas.push({ id: docSnap.id, ...docSnap.data() });
            });

            allFichas.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            let html = `
                <div class="card mb-4" style="border-left: 6px solid var(--primary); background: var(--primary-light);">
                    <div class="d-flex align-items-center gap-3" style="display:flex; align-items:center;">
                        <div style="width: 60px; height: 60px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm);">
                            <i class="bi bi-person-badge-fill" style="font-size: 2rem; color: var(--primary);"></i>
                        </div>
                        <div>
                            <h3 style="margin:0; font-size: 1.5rem; letter-spacing: -0.5px;">${allFichas[0].citizenName}</h3>
                            <p class="text-secondary" style="margin:0;">CPF: <strong>${cpf}</strong> • Total de Fichas: <strong>${allFichas.length}</strong></p>
                        </div>
                    </div>
                </div>
                
                <h3 class="mb-4" style="font-size: 1.25rem;"><i class="bi bi-clock-history me-2"></i> Linha do Tempo de Atendimentos</h3>
                <div class="timeline">
            `;

            for (const ficha of allFichas) {
                const date = ficha.createdAt ? new Date(ficha.createdAt.seconds * 1000).toLocaleString() : 'N/A';
                const sectorStr = formatSector(ficha.targetSector);

                html += `
                    <div class="card mb-4" style="border: 1px solid var(--border-color);">
                        <div class="d-flex justify-content-between align-items-center mb-3" style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="badge" style="background:var(--bg-main); color: var(--text-main); border: 1px solid var(--border-color); padding: 0.5rem 0.75rem;">
                                <i class="bi bi-calendar-event me-2"></i> ${date}
                            </span>
                            <div class="d-flex gap-2" style="display:flex; gap:0.5rem;">
                                <span class="badge" style="background:var(--primary-light); color:var(--primary); padding: 0.5rem 0.75rem;"><i class="bi bi-building me-1"></i> ${sectorStr}</span>
                                <span class="badge ${ficha.status === 'Aberta' ? 'bg-warning' : 'bg-success'}" style="padding: 0.5rem 0.75rem;">
                                    ${ficha.status}
                                </span>
                            </div>
                        </div>
                        <p class="mb-3" style="font-size: 1.1rem; border-bottom: 1px solid var(--bg-main); padding-bottom: 0.5rem;">
                            <strong>Assunto:</strong> ${ficha.subject}
                        </p>
                        <div id="proc-${ficha.id}" style="padding-left: 1rem; border-left: 3px solid var(--border-color);">
                            <small class="text-secondary"><i class="bi bi-arrow-repeat spin"></i> Carregando histórico unificado...</small>
                        </div>
                    </div>
                `;

                loadProceduresForSearch(ficha.id);
            }

            html += `</div>`;
            resultsDiv.innerHTML = html;

        } catch (e) {
            resultsDiv.innerHTML = `<div class="card text-danger">Erro na busca: ${e.message}</div>`;
        }
    }

    async function loadProceduresForSearch(fichaId) {
        const container = document.getElementById(`proc-${fichaId}`);
        try {
            const auditSnap = await getDocs(query(collection(db, "audit_history"), where("fichaId", "==", fichaId)));
            const procSnap = await getDocs(collection(db, "fichas", fichaId, "procedures"));

            const allLogs = [];
            auditSnap.forEach(d => allLogs.push({ ...d.data(), type: 'audit' }));
            procSnap.forEach(d => allLogs.push({ ...d.data(), type: 'procedure' }));

            allLogs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            if (allLogs.length === 0) {
                container.innerHTML = '<small class="text-secondary">Nenhum histórico registrado.</small>';
                return;
            }

            let innerHtml = '<h4 class="mb-3" style="font-size: 0.9rem; color: var(--text-secondary);">Linha do Tempo de Alterações e Atendimentos</h4>';
            allLogs.forEach(l => {
                const lDate = l.timestamp ? new Date(l.timestamp.seconds * 1000).toLocaleString() : 'N/A';

                if (l.type === 'audit') {
                    innerHtml += `
                        <div style="margin-bottom: 8px; font-size: 0.85rem; background: #fff; padding: 10px; border-radius: var(--round-sm); border: 1px solid var(--border-color);">
                            <div class="d-flex justify-content-between mb-1" style="display:flex; justify-content:space-between;">
                                <span class="text-secondary">📅 ${lDate}</span>
                                <span><i class="bi bi-person-circle"></i> <strong>${l.user}</strong></span>
                            </div>
                            <div style="color: var(--text-main);">${l.field}: <span class="text-danger">${l.oldValue}</span> <i class="bi bi-arrow-right"></i> <span class="text-success">${l.newValue}</span></div>
                        </div>
                    `;
                } else {
                    innerHtml += `
                        <div style="margin-bottom: 8px; font-size: 0.85rem; background: var(--primary-light); padding: 10px; border-radius: var(--round-sm); border-left: 3px solid var(--primary);">
                            <div class="d-flex justify-content-between mb-1" style="display:flex; justify-content:space-between;">
                                <span class="text-secondary">📅 ${lDate}</span>
                                <span><i class="bi bi-hospital"></i> <strong>${l.createdBy}</strong></span>
                            </div>
                            <div style="color: var(--text-main); font-style: italic;">"${l.description}"</div>
                        </div>
                    `;
                }
            });
            container.innerHTML = innerHtml;
        } catch (e) {
            console.error(e);
            container.innerHTML = `<small style="color:red">Erro ao carregar detalhes.</small>`;
        }
    }

    function formatSector(sectorKey) {
        const map = {
            'bolsa_familia': 'Bolsa Família',
            'crianca_feliz': 'Criança Feliz',
            'psicologia': 'Psicologia',
            'assistencia_social': 'Assistência Social',
            'loas': 'LOAS',
            'anexo_cras': 'Anexo do CRAS'
        };
        return map[sectorKey] || sectorKey;
    }
}
