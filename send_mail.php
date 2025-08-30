<?php
// ---- Einstellungen ----
$empfaenger = "info@buecking-immobilien.de"; // Deine Mailadresse
$betreff    = "Neue Anfrage über das Kontaktformular";

// ---- Eingaben abholen ----
$name    = trim($_POST["name"] ?? "");
$email   = trim($_POST["email"] ?? "");
$message = trim($_POST["message"] ?? "");

// ---- Grundprüfung ----
if (empty($name) || empty($email) || empty($message) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    die("Bitte alle Felder korrekt ausfüllen!");
}

// ---- Mailinhalt ----
$inhalt = "Neue Nachricht über das Kontaktformular:\n\n";
$inhalt .= "Name: $name\n";
$inhalt .= "E-Mail: $email\n\n";
$inhalt .= "Nachricht:\n$message\n";

// ---- Header ----
$header  = "From: $name <$email>\r\n";
$header .= "Reply-To: $email\r\n";
$header .= "X-Mailer: PHP/" . phpversion();

// ---- Mail senden ----
if (mail($empfaenger, $betreff, $inhalt, $header)) {
    echo "Vielen Dank, Ihre Nachricht wurde erfolgreich gesendet!";
} else {
    echo "Leider gab es ein Problem beim Senden der Nachricht.";
}
?>