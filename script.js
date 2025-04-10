document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const loginSection = document.getElementById('loginSection');
    const loginForm = document.getElementById('loginForm');
    const userNameInput = document.getElementById('userNameInput');
    const loginStatus = document.getElementById('loginStatus');

    const appContainer = document.getElementById('appContainer');
    const userInfo = document.getElementById('userInfo');
    const loggedInUserSpan = document.getElementById('loggedInUser');
    const logoutBtn = document.getElementById('logoutBtn');
    const votingStatusMessage = document.getElementById('votingStatusMessage');

    // Elementos de la tarjeta unificada
    const electionCard = document.getElementById('electionCard');
    const electionCardTitle = document.getElementById('electionCardTitle');
    const electionCardStatus = document.getElementById('electionCardStatus');
    const electionCardContent = document.getElementById('electionCardContent');
    const electionCardActions = document.getElementById('electionCardActions');
    const submitVoteBtn = document.getElementById('submitVoteBtn');
    const voteStatus = document.getElementById('voteStatus');
    const voteCreatorInfo = document.getElementById('voteCreatorInfo');

    // Sección de creación (opcional, para admin)
    const createPollSection = document.getElementById('createPollSection');
    const createPollForm = document.getElementById('createPollForm');
    const pollTitleInput = document.getElementById('pollTitle');
    const candidateInputsContainer = document.getElementById('candidateInputs');
    const addCandidateBtn = document.getElementById('addCandidateBtn');
    const savePollBtn = document.getElementById('savePollBtn'); // Se añadió referencia si se usa
    const createStatus = document.getElementById('createStatus');

    // --- Estado de la Aplicación ---
    let currentUser = null;
    let polls = []; // Array de encuestas { id, title, creator, candidates: [{option, votes}] }
    let nextPollId = 1;
    let votedUsers = new Set(); // Set de nombres de usuarios que ya votaron
    let personeroPollId = null; // ID de la encuesta activa de Personero

    // --- Cargar Datos (Simulado con sessionStorage) ---
    function loadInitialData() {
        const storedUser = sessionStorage.getItem('schoolVotingUser');
        const storedPolls = sessionStorage.getItem('schoolVotingPolls');
        const storedVotedUsers = sessionStorage.getItem('schoolVotedUsers');

        // Cargar encuestas
        if (storedPolls) {
             // ... (lógica de parseo y validación de polls como antes) ...
            try {
                polls = JSON.parse(storedPolls).map(p => ({
                    ...p, id: p.id || 0, title: p.title || "Sin Título", creator: p.creator || "Desconocido",
                    candidates: Array.isArray(p.candidates) ? p.candidates.map(c => ({
                        option: c.option || "Opción inválida", votes: typeof c.votes === 'number' ? c.votes : 0
                    })) : []
                }));
                polls = polls.filter(p => p.id > 0 && p.candidates.length > 0);
                if (polls.length > 0) { nextPollId = Math.max(0, ...polls.map(p => p.id)) + 1; }
                else { nextPollId = 1; }
            } catch (e) { console.error("Error parseando encuestas:", e); polls = []; nextPollId = 1; sessionStorage.removeItem('schoolVotingPolls'); }

        }

        // Crear encuesta de ejemplo si no hay ninguna O SI NO HAY DE PERSONERO
         const personeroExists = polls.some(p => p.title?.trim().toLowerCase().startsWith("elección de personero"));
        if (polls.length === 0 || !personeroExists) {
             console.log("No hay encuesta de personero, creando una de ejemplo...");
             // ***** CAMBIO AQUÍ: Nombres de candidatos actualizados *****
             addPoll("Elección de Personero 2024", "Comité Electoral", ["Personero 1", "Personero 2"]);
        }


        // Cargar usuarios que votaron
        if (storedVotedUsers) {
            // ... (lógica de parseo y validación de votedUsers como antes) ...
            try {
                const parsedVoted = JSON.parse(storedVotedUsers);
                votedUsers = Array.isArray(parsedVoted) ? new Set(parsedVoted) : new Set();
                if (!Array.isArray(parsedVoted)) sessionStorage.removeItem('schoolVotedUsers');
            } catch(e) { console.error("Error parseando votedUsers:", e); votedUsers = new Set(); sessionStorage.removeItem('schoolVotedUsers'); }
        }

        // Buscar la encuesta de Personero
        findAndSetPersoneroPoll();

        // Intentar loguear al usuario
        if (storedUser) {
            loginUser(storedUser);
        } else {
            showLoginView(); // Mostrar vista de login
        }
    }

    // --- Funciones de Utilidad ---
    function showElement(element) { element?.classList.remove('hidden'); }
    function hideElement(element) { element?.classList.add('hidden'); }
    function setStatusMessage(element, message, type = 'info') {
        if (!element) return;
        const text = message || '';
        element.textContent = text;
        element.className = 'status-message'; // Limpiar clases anteriores
        if (text) { element.classList.add(type); }
        if (text) {
            setTimeout(() => {
                if (element.textContent === text) {
                    element.textContent = ''; element.className = 'status-message';
                }
            }, 5000);
        }
    }
    function clearForm(form) {
         form?.reset();
         if (form?.id === 'createPollForm') {
             const dynamicInputs = candidateInputsContainer?.querySelectorAll('div:not(:nth-child(1)):not(:nth-child(2))');
             dynamicInputs?.forEach(div => div.remove());
             candidateInputsContainer?.querySelectorAll('input').forEach(input => input.value = '');
             setStatusMessage(createStatus, '');
         }
     }


    // --- Funciones de Lógica Principal ---

    function findAndSetPersoneroPoll() {
        const poll = polls.find(p => p.title?.trim().toLowerCase().startsWith("elección de personero"));
        personeroPollId = poll ? poll.id : null;
        // console.log("Encuesta de personero activa (ID):", personeroPollId); // Para depuración
    }

    function showLoginView() {
        hideElement(appContainer); hideElement(userInfo); hideElement(electionCard);
        showElement(loginSection);
        userNameInput.value = ''; setStatusMessage(loginStatus, '');
    }

    function loginUser(username) {
        currentUser = username.trim();
        if (!currentUser) { showLoginView(); setStatusMessage(loginStatus, "Nombre inválido.", "error"); return; }
        sessionStorage.setItem('schoolVotingUser', currentUser);
        loggedInUserSpan.textContent = currentUser;
        updateGlobalVotingStatusMessage();
        showElement(userInfo); hideElement(loginSection); showElement(appContainer);
        displayElectionCard(); // Muestra la tarjeta configurada
    }

    function logoutUser() {
        currentUser = null; sessionStorage.removeItem('schoolVotingUser');
        showLoginView();
    }

     function updateGlobalVotingStatusMessage() {
         if (!currentUser) { votingStatusMessage.textContent = ''; votingStatusMessage.className = 'voting-status'; return; }
         votingStatusMessage.textContent = votedUsers.has(currentUser) ? 'Voto Registrado' : 'Voto Pendiente';
         votingStatusMessage.className = `voting-status ${votedUsers.has(currentUser) ? 'voted' : 'not-voted'}`;
     }

    // GESTIÓN DE ENCUESTAS
    function addPoll(title, creator, candidates) {
        const newPoll = {
            id: nextPollId++,
            title: title || "Sin título", creator: creator || "Desconocido",
            candidates: Array.isArray(candidates) ? candidates.map(option => ({ option: String(option).trim(), votes: 0 })) : []
        };
        if (newPoll.candidates.length < 2) { console.error("Intento de crear encuesta inválida."); nextPollId--; return null; }
        polls.push(newPoll);
        savePolls();
        // console.log("Encuesta añadida:", newPoll); // Para depuración
        return newPoll;
    }
    function savePolls() { try { sessionStorage.setItem('schoolVotingPolls', JSON.stringify(polls)); } catch (e) { console.error("Error guardando encuestas:", e); } }
    function saveVotedUsers() { try { sessionStorage.setItem('schoolVotedUsers', JSON.stringify(Array.from(votedUsers))); } catch (e) { console.error("Error guardando votantes:", e); } }
    function findPollById(pollId) { const id = parseInt(pollId); return !isNaN(id) ? polls.find(poll => poll.id === id) || null : null; }

    // CONFIGURAR Y MOSTRAR TARJETA DE ELECCIÓN
    function displayElectionCard() {
        if (!currentUser || !electionCard) return;
        showElement(electionCard); electionCardContent.innerHTML = ''; hideElement(submitVoteBtn);
        setStatusMessage(voteStatus, ''); electionCardStatus.textContent = ''; voteCreatorInfo.textContent = '';

        findAndSetPersoneroPoll();
        const poll = findPollById(personeroPollId);

        if (!poll) {
            electionCardTitle.textContent = "Elección de Personero";
            electionCardStatus.textContent = "La votación no se encuentra activa en este momento.";
        } else {
            electionCardTitle.textContent = poll.title;
            voteCreatorInfo.textContent = `Organizada por: ${poll.creator}`;
            const userAlreadyVoted = votedUsers.has(currentUser);

            if (userAlreadyVoted) {
                electionCardStatus.textContent = "Gracias por participar. Tu voto ya ha sido registrado.";
                renderResults(poll); // Muestra resultados
            } else {
                electionCardStatus.textContent = "Selecciona el candidato de tu preferencia. Solo puedes votar una vez.";
                renderCandidates(poll); // Muestra candidatos
                showElement(submitVoteBtn); // Muestra botón de votar
            }
        }
    }

    // RENDERIZAR CONTENIDO DINÁMICO
    function renderCandidates(poll) {
        if (!poll || !Array.isArray(poll.candidates)) { electionCardContent.innerHTML = '<p>Error al cargar candidatos.</p>'; return; }
        const ul = document.createElement('ul'); ul.id = 'voteCandidateList';
        poll.candidates.forEach((candidate, index) => {
             const li = document.createElement('li');
             const radioId = `poll-${poll.id}-option-${index}`;
             const label = document.createElement('label'); label.htmlFor = radioId; label.textContent = candidate.option;
             const input = document.createElement('input'); input.type = 'radio'; input.id = radioId; input.name = 'voteOption'; input.value = index;
             li.appendChild(input); li.appendChild(label); ul.appendChild(li);
        });
        electionCardContent.innerHTML = ''; electionCardContent.appendChild(ul);
    }
    function renderResults(poll) {
        if (!poll || !Array.isArray(poll.candidates)) { electionCardContent.innerHTML = '<p>Error al cargar resultados.</p>'; return; }
        const ul = document.createElement('ul'); ul.id = 'pollResultsList';
        const sortedCandidates = [...poll.candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));
        sortedCandidates.forEach(candidate => {
             const li = document.createElement('li');
             const optionSpan = document.createElement('span'); optionSpan.className = 'result-option'; optionSpan.textContent = candidate.option;
             const votesSpan = document.createElement('span'); votesSpan.className = 'result-votes'; votesSpan.textContent = `${candidate.votes || 0} voto(s)`;
             li.appendChild(optionSpan); li.appendChild(votesSpan); ul.appendChild(li);
        });
        electionCardContent.innerHTML = ''; electionCardContent.appendChild(ul);
    }

    // --- Event Listeners ---
    loginForm?.addEventListener('submit', (e) => { e.preventDefault(); const username = userNameInput.value; if (username) loginUser(username); else setStatusMessage(loginStatus, 'Ingresa tu nombre.', 'error'); });
    logoutBtn?.addEventListener('click', logoutUser);
    createPollForm?.addEventListener('submit', (e) => { /* ... (sin cambios) ... */ });
    addCandidateBtn?.addEventListener('click', () => { /* ... (sin cambios) ... */ });

    // Enviar Voto
    submitVoteBtn?.addEventListener('click', () => {
        if (!currentUser || !personeroPollId) return;
        const poll = findPollById(personeroPollId);
        if (!poll) { setStatusMessage(voteStatus, 'Error: Elección no encontrada.', 'error'); return; }
        if (votedUsers.has(currentUser)) { setStatusMessage(voteStatus, 'Ya has emitido tu voto.', 'info'); return; }

        const selectedOptionInput = electionCardContent.querySelector('input[name="voteOption"]:checked');
        if (!selectedOptionInput) { setStatusMessage(voteStatus, 'Por favor, selecciona un candidato.', 'error'); return; }

        const selectedCandidateIndex = parseInt(selectedOptionInput.value);
        if (selectedCandidateIndex >= 0 && selectedCandidateIndex < poll.candidates.length) {
             poll.candidates[selectedCandidateIndex].votes = (poll.candidates[selectedCandidateIndex].votes || 0) + 1;
        } else { setStatusMessage(voteStatus, 'Error: Opción inválida.', 'error'); return; }

        votedUsers.add(currentUser);
        savePolls();
        saveVotedUsers();

        setStatusMessage(voteStatus, '¡Voto registrado con éxito!', 'success');
        hideElement(submitVoteBtn);
        updateGlobalVotingStatusMessage();

        // **CAMBIO CLAVE: Mostrar resultados inmediatamente**
        electionCardStatus.textContent = "Gracias por participar. Tu voto ha sido registrado.";
        renderResults(poll); // <-- Esta línea actualiza el contenido
    });

    // --- Inicialización ---
    loadInitialData();

}); // Fin de DOMContentLoaded