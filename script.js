const canvas = document.getElementById('canvas');
let pageId;
let userName; // Variable pour stocker le pseudo de l'utilisateur

window.onload = () => {
    // Demande le pseudo de l'utilisateur
    userName = prompt("Veuillez entrer votre pseudo :") || "Invité"; // Valeur par défaut si aucun pseudo n'est fourni
    pageId = Math.floor(Math.random() * 100);
    console.log(`Page ID: ${pageId}, User Name: ${userName}`);
};

const ctx = canvas.getContext('2d');
const ws = new WebSocket('ws://localhost:8080');

// Fonction pour convertir RGB en hexadécimal
function rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

// Écouteur d'événements pour le clic sur le canevas
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Obtenir les données de l'image au point cliqué
    const pixelData = ctx.getImageData(x, y, 10, 10).data; // Récupère les données RGBA
    const r = pixelData[0]; // Rouge
    const g = pixelData[1]; // Vert
    const b = pixelData[2]; // Bleu

    // Convertir les valeurs RGB en format hexadécimal
    const hexColor = rgbToHex(r, g, b);
    let color = 'black'; // Couleur par défaut
    console.log(`Couleur au clic: ${hexColor}`);

    // Changer la couleur si le pixel est noir
    if (hexColor === '#000000') {
        color = 'white';
    }

    // Inclure le pseudo dans les données envoyées
    const pixelDataToSend = { 
        action: 'draw', 
        data: { id: `${x},${y}`, x, y, color, user: userName }, 
        id: pageId 
    };
    
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(pixelDataToSend));
        console.log('Données envoyées:', pixelDataToSend); // Log des données envoyées
    } else {
        console.error('WebSocket is not open:', ws.readyState);
    }
});

// Gestion des messages reçus via WebSocket pour le dessin et le chat
ws.onmessage = (event) => {
    console.log('Message reçu:', event.data); // Log du message brut reçu

    const { action, data } = JSON.parse(event.data);
    
    console.log('Action:', action); // Log de l'action reçue
    
    if (action === 'draw') {
        ctx.fillStyle = data.color;
        ctx.fillRect(data.x, data.y, 10, 10);  
        console.log(`${data.user} a dessiné à (${data.x}, ${data.y})`);
        
        displayMessage(`${data.user} a dessiné à (${data.x}, ${data.y})`);
        
    } else if (action === 'init') {
        Object.values(data).forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 10, 10);  
        });
    } else if (action === 'chat') {
        console.log('Message reçu du chat:', data); // Log des données du message chat
        displayMessage(`${data.user}: ${data.text}`); // Affichage du message reçu
    }
};

// Gestion de la fermeture de la connexion WebSocket
ws.onclose = (event) => {
    console.log('WebSocket is closed:', event.reason);
};

// Gestion des erreurs WebSocket
ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

// Fonction pour afficher les messages dans la zone de messages du chat
const messageArea = document.getElementById('message-area');
const sendButton = document.getElementById('send-button');
const messageInput = document.getElementById('message');
// Événement pour l'envoi de message dans le chat en cliquant sur le bouton "Envoyer"
sendButton.addEventListener('click', () => {
    sendChatMessage(); // Appel direct à la fonction d'envoi de message
});

// Permettre l'envoi du message en appuyant sur "Entrée"
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Empêche le comportement par défaut du formulaire si nécessaire
        sendChatMessage(); // Appel direct à la fonction d'envoi de message
    }
});

// Fonction pour envoyer un message au serveur via WebSocket
function sendChatMessage() {
    const messageText = messageInput.value.trim();
   
    if (messageText) {
        const messageData = { 
            action: 'chat', 
            data: { text: messageText, user: userName }, 
            id: pageId 
        };        
        // Envoyer le message au serveur via WebSocket
        ws.send(JSON.stringify(messageData));
        console.log('Message envoyé:', messageData); // Log du message envoyé

        // Effacer le champ de saisie
        messageInput.value = '';
        
        // Afficher le message localement aussi
        displayMessage(`Vous : ${messageText}`);
    }
}

// Fonction pour afficher un message dans la zone de messages du chat
function displayMessage(message) {
    const newMessage = document.createElement('p');
    newMessage.textContent = message;

    // Ajouter le nouveau message à la zone de messages
    messageArea.appendChild(newMessage);

    // Faire défiler vers le bas
    messageArea.scrollTop = messageArea.scrollHeight;
}