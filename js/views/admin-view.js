import { UserService } from '../services/user-service.js';
import { db } from '../firebase-config.js';
import { collection, getDocs, doc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { createUserWithEmailAndPassword, getAuth, getAuth as getAuth2, createUserWithEmailAndPassword as createUser2 } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

// Note: Creating authentication users programmatically requires Admin SDK (Node.js) or a secondary app instance
// ... (comments remain)
// Since we are client-side only, we will simulate the "Create User" by adding to Firestore, 
// BUT to actually create Auth users, the current user (Admin) would be signed out if we used the main 'auth'.
// Workaround for Client-Side Admin Creator: 
// Ideally, use a second invisible Form or instruct to use 'setup.html' for new users.
// For this MVP, we will try to implement a simple "add user" modal that might require re-login or use a secondary Auth app instance if possible.
// SIMPLER APPROACH: Just CRUD on Firestore 'users' collection for now, and assume Auth is handled or we use a secondary App init.

// Let's use a function to render the user manager
export async function render(container, adminUser) {
    container.innerHTML = `
        <h2>Painel Administrativo - Gestão de Usuários</h2>
        <div class="card mt-3">
            <div class="d-flex justify-content-between mb-3" style="display: flex; justify-content: space-between; align-items: center;">
                <h3>Usuários Cadastrados</h3>
                <button id="btnNewUser" class="btn btn-success">+ Novo Usuário</button>
            </div>
            <div class="table-responsive">
                <table class="table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; background: #f8f9fa;">
                            <th style="padding: 10px;">Nome</th>
                            <th style="padding: 10px;">Usuário/Email</th>
                            <th style="padding: 10px;">Função</th>
                            <th style="padding: 10px;">Setor</th>
                            <th style="padding: 10px;">Status</th>
                            <th style="padding: 10px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody">
                        <tr><td colspan="6" class="text-center">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Add User Modal (Hidden by default) -->
        <div id="userModal" style="display:none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5);">
            <div class="card" style="width: 400px; margin: 50px auto; padding: 20px;">
                <h3 id="modalTitle">Novo Usuário</h3>
                <form id="newUserForm">
                    <div class="form-group">
                        <label>Nome Completo</label>
                        <input type="text" id="newUserName" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Nome de Usuário (Login)</label>
                        <input type="text" id="newUserLogin" class="form-control" placeholder="ex: psicologia1" required>
                    </div>
                    <div class="form-group">
                        <label>Senha Inicial</label>
                        <input type="password" id="newUserPass" class="form-control" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label>Função</label>
                        <select id="newUserRole" class="form-control" required>
                            <option value="recepcao">Recepcionista</option>
                            <option value="bolsa_familia">Bolsa Família</option>
                            <option value="crianca_feliz">Criança Feliz</option>
                            <option value="psicologia">Psicologia</option>
                            <option value="admin">Administrador (Chefe)</option>
                        </select>
                    </div>
                    <div class="mt-3 text-right">
                        <button type="button" id="btnCancelModal" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- System Overview - All Fichas -->
        <h2 class="mt-5">Visão Geral - Atendimentos</h2>
        <div class="card mt-3">
            <h3>Todas as Fichas</h3>
            <div class="table-responsive">
                <table class="table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; background: #f8f9fa;">
                            <th style="padding: 10px;">Cidadão</th>
                            <th style="padding: 10px;">CPF</th>
                            <th style="padding: 10px;">Setor Atual</th>
                            <th style="padding: 10px;">Data Criação</th>
                            <th style="padding: 10px;">Status</th>
                            <th style="padding: 10px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="allFichasTableBody">
                        <tr><td colspan="6" class="text-center">Carregando fichas...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Load Users
    loadUsersList();
    // Load Fichas
    loadAllFichas();

    // Event Listeners
    document.getElementById('btnNewUser').addEventListener('click', () => {
        document.getElementById('userModal').style.display = 'block';
    });

    document.getElementById('btnCancelModal').addEventListener('click', () => {
        document.getElementById('userModal').style.display = 'none';
    });

    // Handle Form Submit
    document.getElementById('newUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newUserName').value;
        const login = document.getElementById('newUserLogin').value;
        const pass = document.getElementById('newUserPass').value;
        const role = document.getElementById('newUserRole').value;

        let sector = 'Recepção';
        if (role === 'bolsa_familia') sector = 'Bolsa Família';
        if (role === 'crianca_feliz') sector = 'Criança Feliz';
        if (role === 'psicologia') sector = 'Psicologia';
        if (role === 'admin') sector = 'Administração';

        alert('Atenção: Para criar um novo usuário de autenticação neste ambiente de demonstração, o sistema usará o setup secundário. (Na prática real, usaríamos Cloud Functions). Aqui apenas simularemos o registro no banco de dados para a lista, mas o login real precisa ser criado via "setup.html" ou painel pelo tempo.');

        // IMPORTANT: In a client-side only app, we can't create another user without logging out the current one using the main 'auth'.
        // Strategies: 
        // 1. Use a secondary App instance to create user.
        // 2. Just create the Firestore document and tell user to create Auth manually.
        // Let's try Strategy 1: Secondary App.

        try {
            const success = await CreateUserSecondaryApp(login, pass, {
                name, role, sector, active: true
            });

            if (success) {
                alert('Usuário criado com sucesso!');
                document.getElementById('userModal').style.display = 'none';
                loadUsersList();
            }
        } catch (error) {
            alert('Erro ao criar: ' + error.message);
        }
    });
}

async function loadUsersList() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="6">Carregando...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        tbody.innerHTML = '';

        querySnapshot.forEach((docSnap) => {
            const u = docSnap.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 10px;">${u.name}</td>
                <td style="padding: 10px;">${u.email || u.username}</td>
                <td style="padding: 10px;">${formatRole(u.role)}</td>
                <td style="padding: 10px;">${u.sector}</td>
                <td style="padding: 10px;">
                    <span style="color: ${u.active ? 'green' : 'red'}">${u.active ? 'Ativo' : 'Inativo'}</span>
                </td>
                <td style="padding: 10px;">
                    <button class="btn btn-sm btn-outline-danger" onclick="toggleUser('${docSnap.id}', ${u.active})">
                        ${u.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <!-- Edit would go here -->
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:red">Erro: ${e.message}</td></tr>`;
    }
}

function formatRole(role) {
    const map = {
        'admin': 'Chefe/Admin',
        'recepcao': 'Recepcionista',
        'bolsa_familia': 'Bolsa Família',
        'crianca_feliz': 'Criança Feliz',
        'psicologia': 'Psiclóloga(o)'
    };
    return map[role] || role;
}

// Helper to create user using a secondary app instance to avoid logging out admin

async function CreateUserSecondaryApp(username, password, userData) {
    // Re-config for secondary app
    // We need to import the config object again or hardcode it
    // To be clean, we reuse the config from window or re-declare
    // Since modules are strict, let's just re-declare the config object we know exists 
    const firebaseConfig = {
        apiKey: "AIzaSyD3tsO5FLdvu5_LmCT7U1kW-2qhTfMRzRg",
        authDomain: "social-assist-sistema.firebaseapp.com",
        projectId: "social-assist-sistema",
        storageBucket: "social-assist-sistema.firebasestorage.app",
        messagingSenderId: "88500554526",
        appId: "1:88500554526:web:1c2c3278f1a03d659cd70f"
    };

    const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
    const secondaryAuth = getAuth2(secondaryApp);

    // Prepare email
    let email = username.trim();
    if (!email.includes('@')) email += '@sistema.local';

    try {
        const userCred = await createUser2(secondaryAuth, email, password);
        const newUser = userCred.user;

        // Create profile in Firestore (using MAIN app db connection)
        await UserService.createUserProfile(newUser.uid, {
            ...userData,
            email: email,
            username: username
        });

        // Cleanup
        // signOut(secondaryAuth); // optional
        return true;
    } catch (e) {
        throw e;
    }
}

// Global scope hack for onclick in table
window.toggleUser = async (uid, currentStatus) => {
    if (!confirm('Tem certeza que deseja alterar o status deste usuário?')) return;
    try {
        await updateDoc(doc(db, "users", uid), {
            active: !currentStatus
        });
        loadUsersList(); // reload
    } catch (e) {
        alert('Erro ao atualizar: ' + e.message);
    }
};

async function loadAllFichas() {
    const tbody = document.getElementById('allFichasTableBody');
    // Simple query to get all fichas, ordered by creation time if possible
    // Note: requires index for sorting, so we'll just get all for now
    try {
        const q = collection(db, "fichas");
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma ficha encontrada.</td></tr>';
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
                <td style="padding: 10px;">${formatSector(f.targetSector)}</td>
                <td style="padding: 10px;">${date}</td>
                <td style="padding: 10px;">
                    <span class="badge ${f.status === 'Aberta' ? 'bg-warning' : 'bg-success'}" 
                          style="padding: 4px 8px; border-radius: 4px; background: ${f.status === 'Aberta' ? '#ffc107' : '#198754'}; color: ${f.status === 'Aberta' ? '#000' : '#fff'};">
                        ${f.status}
                    </span>
                </td>
                <td style="padding: 10px;">
                    <button class="btn btn-sm btn-primary">Ver Detalhes</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="6" style="color:red">Erro ao carregar fichas: ${e.message}</td></tr>`;
    }
}

function formatSector(sectorKey) {
    const map = {
        'bolsa_familia': 'Bolsa Família',
        'crianca_feliz': 'Criança Feliz',
        'psicologia': 'Psicologia'
    };
    return map[sectorKey] || sectorKey;
}
