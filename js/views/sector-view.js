import { db } from '../firebase-config.js';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, Timestamp, addDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { AuditService } from '../services/audit-service.js';

export async function render(container, user) {
    let unsubs = [];
    console.log("Rendering Sector View for User:", user);
    const currentSectorKey = user.role;

    container.innerHTML = `
        <div class="fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4" style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0;"><i class="bi bi-building me-2" style="color:var(--primary);"></i> Painel do Setor: ${user.sector || currentSectorKey}</h2>
                <button class="btn btn-primary btn-sm" id="btnRefresh">
                    <i class="bi bi-arrow-clockwise"></i> Atualizar
                </button>
            </div>

            <p class="text-secondary mb-4">Fichas encaminhadas para este setor aguardando atendimento.</p>

            <div class="card">
                <div class="d-flex justify-content-between mb-3" style="display: flex; justify-content: space-between; align-items:center;">
                    <h3 style="margin:0; font-size: 1.25rem;"><i class="bi bi-hourglass-split me-2"></i> Fichas em Aberto</h3>
                </div>
                
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Cidadão</th>
                                <th>CPF</th>
                                <th>Assunto</th>
                                <th>Data Encaminhamento</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="sectorTableBody">
                            <tr><td colspan="5" class="text-center text-secondary">Carregando fichas...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Detail Modal (Hidden) -->
        <div id="fichaModal" style="display:none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); backdrop-filter: blur(4px); overflow-y: auto; z-index: 1000;">
            <div class="card" style="width: 90%; max-width: 700px; margin: 30px auto; padding: 2.5rem; border:none; box-shadow: var(--shadow-lg);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
                    <h3 id="modalTitle" style="margin:0;"><i class="bi bi-person-workspace me-2" style="color:var(--primary);"></i> Atendimento</h3>
                    <button id="btnCloseModal" class="btn btn-sm btn-outline-secondary" style="border:none; font-size:1.5rem; padding:0;">&times;</button>
                </div>
                
                <div id="modalContent" class="mb-4" style="background: var(--bg-main); padding: 1.5rem; border-radius: var(--round-md); border: 1px solid var(--border-color);"></div>
                
                <h4 class="mb-3"><i class="bi bi-pencil-square me-2"></i> Novo Procedimento / Evolução</h4>
                <form id="procedureForm">
                    <input type="hidden" id="currentFichaId">
                    <div class="form-group">
                        <label class="form-label">Descrição do Procedimento</label>
                        <textarea id="procDesc" class="form-control" rows="4" required placeholder="Descreva detalhadamente o atendimento realizado..."></textarea>
                    </div>
                    <div style="display:flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                        <button type="submit" class="btn btn-primary" id="btnSaveProc">
                            <i class="bi bi-save"></i> Registrar
                        </button>
                        <button type="button" id="btnConclude" class="btn btn-success">
                            <i class="bi bi-check-all"></i> Finalizar Ficha
                        </button>
                    </div>
                </form>

                <hr class="my-4" style="border-top: 1px solid var(--border-color);">
                <h4 class="mb-3"><i class="bi bi-journal-text me-2"></i> Histórico de Atendimentos</h4>
                <div id="previousProcedures" style="max-height: 250px; overflow-y: auto; padding-right: 5px;">
                    <small class="text-secondary text-center d-block">Nenhum atendimento anterior...</small>
                </div>
            </div>
        </div>
    `;

    // Real-time Listener for Sector Fichas
    const q = query(
        collection(db, "fichas"),
        where("targetSector", "==", currentSectorKey),
        where("status", "==", "Aberta")
    );

    const unsub = onSnapshot(q, (snap) => {
        displaySectorFichas(snap);
    });
    unsubs.push(unsub);

    function displaySectorFichas(snap) {
        const tbody = document.getElementById('sectorTableBody');
        if (!tbody) return;

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary p-4">Nenhuma ficha pendente para este setor.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        snap.forEach((docSnap) => {
            const f = docSnap.data();
            const dateObj = f.createdAt ? new Date(f.createdAt.seconds * 1000) : null;
            const dateStr = dateObj ? dateObj.toLocaleString() : 'N/A';

            // Priority logic for Sector
            let priorityClass = "";
            let priorityIcon = "";
            if (dateObj) {
                const diffHours = (new Date() - dateObj) / (1000 * 60 * 60);
                if (diffHours > 2) {
                    priorityClass = "priority-alert";
                    priorityIcon = '<i class="bi bi-exclamation-triangle-fill text-danger pulse-icon me-1"></i>';
                } else if (diffHours > 1) {
                    priorityClass = "priority-warning";
                    priorityIcon = '<i class="bi bi-clock-history text-warning me-1"></i>';
                }
            }

            const tr = document.createElement('tr');
            if (priorityClass) tr.className = priorityClass;
            tr.innerHTML = `
                <td>${priorityIcon}<strong>${f.citizenName}</strong></td>
                <td class="text-secondary">${f.citizenCPF}</td>
                <td><span class="badge bg-primary" style="background:var(--primary-light); color:var(--primary); font-weight:500;">${f.subject}</span></td>
                <td>${dateStr}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="openFicha('${docSnap.id}')">
                        <i class="bi bi-play-fill"></i> Atender
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Event Listeners
    document.getElementById('btnRefresh').addEventListener('click', () => {
        // Refresh is handled by onSnapshot, but we can re-trigger if UI gets stuck
        // effectively doing nothing or a minor re-render
    });
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

    async function addProcedure(fichaId, description, user, conclude = false) {
        try {
            const fichaRef = doc(db, "fichas", fichaId);

            await addDoc(collection(db, "fichas", fichaId, "procedures"), {
                description: description,
                type: conclude ? 'Conclusão' : 'Atendimento',
                timestamp: Timestamp.now(),
                createdBy: user.name || user.email
            });

            if (conclude) {
                const currentFicha = (await getDoc(fichaRef)).data();
                await updateDoc(fichaRef, {
                    status: 'Concluída',
                    updatedAt: Timestamp.now()
                });

                await AuditService.logChanges(fichaId, user.name || user.email, [
                    { field: "Status", oldVal: "Aberta", newVal: "Concluída" }
                ], currentFicha.subject);

                alert('Ficha concluída com sucesso!');
            } else {
                alert('Procedimento registrado!');
            }

            document.getElementById('fichaModal').style.display = 'none';
            document.getElementById('procDesc').value = '';

        } catch (e) {
            alert('Erro ao salvar: ' + e.message);
        }
    }

    window.openFicha = async (id) => {
        try {
            const docSnap = await getDoc(doc(db, "fichas", id));
            if (!docSnap.exists()) return;
            const f = docSnap.data();

            document.getElementById('currentFichaId').value = id;
            document.getElementById('modalTitle').innerHTML = `<i class="bi bi-person-workspace me-2" style="color:var(--primary);"></i> Atendendo: ${f.citizenName}`;
            document.getElementById('modalContent').innerHTML = `
                <div class="row" style="display:flex; gap:1.5rem; flex-wrap:wrap;">
                    <div style="flex:1; min-width:200px;">
                        <p class="mb-1 text-secondary" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">CPF do Cidadão</p>
                        <p class="mb-3"><strong>${f.citizenCPF}</strong></p>
                        <p class="mb-1 text-secondary" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Endereço</p>
                        <p class="mb-0">${f.address?.street}, ${f.address?.neighborhood}</p>
                    </div>
                    <div style="flex:2; min-width:250px;">
                        <label class="form-label" style="font-size:0.75rem; text-transform:uppercase; font-weight:600;">Assunto / Solicitação (Editável)</label>
                        <div style="position:relative;">
                            <textarea id="sectorEditSubject" class="form-control" rows="2" style="font-size:0.9rem;">${f.subject || ''}</textarea>
                            <div id="sectorSaveIndicator" style="display:none; position:absolute; bottom:5px; right:10px; font-size:0.7rem;" class="text-primary">
                                <i class="bi bi-cloud-check"></i> Salvando...
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Auto-save subject
            let lastSubject = f.subject || '';
            document.getElementById('sectorEditSubject').onblur = async (e) => {
                const newSub = e.target.value;
                if (newSub === lastSubject) return;
                const indicator = document.getElementById('sectorSaveIndicator');
                indicator.style.display = 'block';
                try {
                    await updateDoc(doc(db, "fichas", id), { subject: newSub });
                    await AuditService.logChanges(id, user.name || user.email,
                        [{ field: "Assunto (Setor)", oldVal: lastSubject, newVal: newSub }], newSub);
                    lastSubject = newSub;
                } catch (err) { console.error(err); }
                setTimeout(() => indicator.style.display = 'none', 1000);
            };

            // Load Previous Procedures
            const procDiv = document.getElementById('previousProcedures');
            procDiv.innerHTML = '<div class="text-center p-3 text-secondary"><i class="bi bi-arrow-repeat spin"></i> Carregando história...</div>';
            const qProc = query(collection(db, "fichas", id, "procedures"), orderBy("timestamp", "desc"));
            const procSnap = await getDocs(qProc);

            if (procSnap.empty) {
                procDiv.innerHTML = '<div class="text-center p-4 text-secondary" style="background:var(--bg-main); border-radius:var(--round-md);">Nenhum atendimento anterior registrado.</div>';
            } else {
                procDiv.innerHTML = '';
                procSnap.forEach(pDoc => {
                    const p = pDoc.data();
                    const pDate = p.timestamp ? new Date(p.timestamp.seconds * 1000).toLocaleString() : 'N/A';
                    procDiv.innerHTML += `
                        <div style="margin-bottom: 12px; padding: 1rem; background: #fff; border: 1px solid var(--border-color); border-left: 4px solid var(--primary); border-radius: var(--round-md);">
                            <div class="d-flex justify-content-between mb-2" style="display:flex; justify-content:space-between; align-items:center;">
                                <strong style="font-size: 0.85rem;"><i class="bi bi-calendar3 me-1"></i> ${pDate}</strong>
                                <strong style="font-size: 0.85rem;"><i class="bi bi-person me-1"></i> ${p.createdBy}</strong>
                            </div>
                            <div class="badge bg-primary mb-2" style="font-size:0.7rem; background:var(--primary-light); color:var(--primary);">${p.type}</div>
                            <div style="font-size: 0.9rem; line-height: 1.4; color: var(--text-secondary); white-space: pre-wrap;">${p.description}</div>
                        </div>
                    `;
                });
            }

            document.getElementById('fichaModal').style.display = 'block';
        } catch (e) {
            alert("Erro ao abrir ficha: " + e.message);
        }
    };
}
