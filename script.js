const messageInput = document.getElementById("messageInput");
const boutonEnvoyer = document.getElementById("boutonEnvoyer");
const listeMessages = document.getElementById("listeMessages");

boutonEnvoyer.addEventListener("click", () => {
const message = messageInput.value;
const nouveauMessage = document.createElement("div");
nouveauMessage.textContent = message;

listeMessages.appendChild(nouveauMessage);
});