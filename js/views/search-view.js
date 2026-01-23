import { db } from '../firebase-config.js';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function render(container, user) {
    container.innerHTML = `
        <h2>Busca Inteligente - Histórico por CPF</h2>
        <div class="card mt-3">
            <p>Consulte o histórico completo de um cidadão em todos os setores.</p>
            <div class="form-group" style="display: flex; gap: 10px; max-width: 500px;">
                <input type="text" id="searchCPF" class="form-control" placeholder="000.000.000-00" maxlength="14">
                <button id="btnDoSearch" class="btn btn-primary">🔍 Buscar</button>
            </div>
        </div>

        <div id="searchResults" class="mt-4">
            <!-- Dynamic Results -->
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
}

async function performGlobalSearch(cpf) {
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<div class="text-center">⌛ Buscando histórico completo...</div>';

    try {
        // Query ALL fichas for this CPF
        const q = query(collection(db, "fichas"), where("citizenCPF", "==", cpf));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            resultsDiv.innerHTML = `
                <div class="card text-center">
                    <p>Nenhum registro encontrado para o CPF ${cpf}.</p>
                </div>
            `;
            return;
        }

        let allFichas = [];
        querySnapshot.forEach(docSnap => {
            allFichas.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort by date newest first
        allFichas.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        let html = `
            <div class="card mb-3" style="border-left: 5px solid var(--primary-color);">
                <h3>Cidadão: ${allFichas[0].citizenName}</h3>
                <p><strong>CPF:</strong> ${cpf}</p>
                <p><strong>Total de Fichas:</strong> ${allFichas.length}</p>
            </div>
            
            <h3>Linha do Tempo de Atendimentos</h3>
            <div class="timeline mt-3">
        `;

        for (const ficha of allFichas) {
            const date = ficha.createdAt ? new Date(ficha.createdAt.seconds * 1000).toLocaleString() : 'N/A';
            const sectorStr = formatSector(ficha.targetSector);

            html += `
                <div class="card mb-3" style="background: #fdfdfd; border: 1px solid #eee;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="badge" style="background: #e9ecef; color: #333; padding: 5px 10px; border-radius: 5px;">
                            ${date} - Setor: ${sectorStr}
                        </span>
                        <span style="font-weight:bold; color: ${ficha.status === 'Aberta' ? 'var(--primary-color)' : 'var(--success-color)'}">
                            Status: ${ficha.status}
                        </span>
                    </div>
                    <p class="mt-2"><strong>Assunto Inicial:</strong> ${ficha.subject}</p>
                    <div style="margin-top: 10px; padding-left: 20px; border-left: 3px solid #ddd;" id="proc-${ficha.id}">
                        <small>Carregando procedimentos...</small>
                    </div>
                </div>
            `;

            // Trigger loading procedures for this ficha
            loadProceduresForSearch(ficha.id);
        }

        html += `</div>`;
        resultsDiv.innerHTML = html;

    } catch (e) {
        resultsDiv.innerHTML = `<div class="card" style="color:red">Erro na busca: ${e.message}</div>`;
    }
}

async function loadProceduresForSearch(fichaId) {
    const container = document.getElementById(`proc-${fichaId}`);
    try {
        const q = query(collection(db, "fichas", fichaId, "procedures"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);

        if (snap.empty) {
            container.innerHTML = '<small class="text-secondary">Nenhum procedimento registrado.</small>';
            return;
        }

        let innerHtml = '<strong>Procedimentos:</strong><br>';
        snap.forEach(pDoc => {
            const p = pDoc.data();
            const pDate = p.timestamp ? new Date(p.timestamp.seconds * 1000).toLocaleString() : 'N/A';
            innerHtml += `
                <div style="margin-bottom: 8px; font-size: 0.9rem; background: #fff; padding: 5px; border-radius: 4px;">
                    <span style="color: #666;">[${pDate}] - <strong>${p.createdBy}</strong></span><br>
                    <span>${p.description}</span>
                </div>
            `;
        });
        container.innerHTML = innerHtml;
    } catch (e) {
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
