import { db } from '../firebase-config.js';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, Timestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function render(container, user) {
    // Map user role to database sector key
    // admin-view.js saves roles as: 'bolsa_familia', 'crianca_feliz', 'psicologia'
    // reception-view.js saves targetSector as: 'bolsa_familia', 'crianca_feliz', 'psicologia'
    // So we can use user.role directly if it matches, or we need a map.

    // Assuming user.role matches the targetSector values exactly for simplicity,
    // or we handle the 'recepcao' case (though they shouldn't see this view).
    const currentSectorKey = user.role;

    container.innerHTML = `
        <h2>Painel do Setor: ${user.sector || currentSectorKey}</h2>
        <p class="text-secondary">Fichas encaminhadas para este setor.</p>

        <div class="card mt-3">
            <div class="d-flex justify-content-between mb-3" style="display: flex; justify-content: space-between;">
                <h3>Fichas em Aberto</h3>
                <button class="btn btn-sm btn-outline-primary" id="btnRefresh">Atualizar</button>
            </div>
            
            <div class="table-responsive">
                <table class="table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; background: #f8f9fa;">
                            <th style="padding: 10px;">Cidadão</th>
                            <th style="padding: 10px;">CPF</th>
                            <th style="padding: 10px;">Assunto</th>
                            <th style="padding: 10px;">Data Encaminhamento</th>
                            <th style="padding: 10px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="sectorTableBody">
                        <tr><td colspan="5" class="text-center">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Detail Modal (Hidden) -->
        <div id="fichaModal" style="display:none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); overflow-y: auto;">
            <div class="card" style="width: 90%; max-width: 600px; margin: 30px auto; padding: 20px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 id="modalTitle">Atendimento</h3>
                    <button id="btnCloseModal" class="btn btn-sm btn-secondary">X</button>
                </div>
                <hr>
                <div id="modalContent"></div>
                
                <hr class="mt-3">
                <h4>Novo Procedimento / Evolução</h4>
                <form id="procedureForm">
                    <input type="hidden" id="currentFichaId">
                    <div class="form-group">
                        <label class="form-label">Descrição do Procedimento</label>
                        <textarea id="procDesc" class="form-control" rows="3" required placeholder="Descreva o atendimento realizado..."></textarea>
                    </div>
                    <div style="display:flex; gap: 10px; justify-content: flex-end;">
                        <button type="submit" class="btn btn-primary">Registrar Procedimento</button>
                        <button type="button" id="btnConclude" class="btn btn-success">Finalizar Ficha</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    loadSectorFichas(currentSectorKey);

    // Event Listeners
    document.getElementById('btnRefresh').addEventListener('click', () => loadSectorFichas(currentSectorKey));
    document.getElementById('btnCloseModal').addEventListener('click', () => {
        document.getElementById('fichaModal').style.display = 'none';
    });

    // Handle Procedure Submit
    document.getElementById('procedureForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fichaId = document.getElementById('currentFichaId').value;
        const desc = document.getElementById('procDesc').value;
        await addProcedure(fichaId, desc, user, false);
    });

    // Handle Conclusion
    document.getElementById('btnConclude').addEventListener('click', async () => {
        if (!confirm("Deseja realmente finalizar esta ficha?")) return;
        const fichaId = document.getElementById('currentFichaId').value;
        const desc = document.getElementById('procDesc').value;

        let finalDesc = desc;
        if (!finalDesc.trim()) {
            finalDesc = "Atendimento finalizado/concluído.";
        }

        await addProcedure(fichaId, finalDesc, user, true);
    });
}

async function loadSectorFichas(sectorKey) {
    const tbody = document.getElementById('sectorTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Carregando...</td></tr>';

    try {
        const q = query(
            collection(db, "fichas"),
            where("targetSector", "==", sectorKey),
            where("status", "==", "Aberta") // Only open fichas
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma ficha pendente para este setor.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        querySnapshot.forEach((docSnap) => {
            const f = docSnap.data();
            const date = f.createdAt ? new Date(f.createdAt.seconds * 1000).toLocaleString() : 'N/A';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 10px;">${f.citizenName}</td>
                <td style="padding: 10px;">${f.citizenCPF}</td>
                <td style="padding: 10px;">${f.subject}</td>
                <td style="padding: 10px;">${date}</td>
                <td style="padding: 10px;">
                    <button class="btn btn-sm btn-primary" onclick="openFicha('${docSnap.id}')">Atender</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="5" style="color:red">Erro: ${e.message}</td></tr>`;
    }
}

async function addProcedure(fichaId, description, user, conclude = false) {
    try {
        const fichaRef = doc(db, "fichas", fichaId);

        // 1. Add to subcollection (better for large history) OR Update Array (simpler for now)
        // Let's use Array as per plan initially, or subcollection? 
        // Plan said: "Sub-collection `procedures` for scalability." -> Let's do that.

        await addDoc(collection(db, "fichas", fichaId, "procedures"), {
            description: description,
            type: conclude ? 'Conclusão' : 'Atendimento',
            timestamp: Timestamp.now(),
            createdBy: user.name || user.email
        });

        // 2. Update status if conclude
        if (conclude) {
            await updateDoc(fichaRef, {
                status: 'Concluída',
                updatedAt: Timestamp.now()
            });
            alert('Ficha concluída com sucesso!');
        } else {
            alert('Procedimento registrado!');
        }

        document.getElementById('fichaModal').style.display = 'none';
        document.getElementById('procedureForm').reset();

        // Refresh list
        loadSectorFichas(user.role);

    } catch (e) {
        alert('Erro ao salvar: ' + e.message);
        console.error(e);
    }
}

// Helper to open modal (Global scope hack)
import { getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.openFicha = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, "fichas", id));
        if (!docSnap.exists()) return;
        const f = docSnap.data();

        document.getElementById('currentFichaId').value = id;
        document.getElementById('modalTitle').textContent = `Atendendo: ${f.citizenName}`;
        document.getElementById('modalContent').innerHTML = `
            <p><strong>CPF:</strong> ${f.citizenCPF}</p>
            <p><strong>Assunto:</strong> ${f.subject}</p>
            <p><strong>Endereço:</strong> ${f.address?.street}, ${f.address?.neighborhood}</p>
            <p><strong>Status:</strong> ${f.status}</p>
        `;

        document.getElementById('fichaModal').style.display = 'block';
    } catch (e) {
        alert("Erro ao abrir ficha: " + e.message);
    }
};
