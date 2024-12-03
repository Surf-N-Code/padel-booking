# Features

## Register

### Register via Frontend

- how to get the telegram user id?

### Telegram Registration flow

- Api call from uchat with new registration from user
- api endpoint checks if user with that telegram id already exists
- if not, user is sent a link to register on the website with prefilled telegram id in a hidden field using url params
- user needs to fill in username and password in the register form
- if the url does not contain the telegram id, the user is sent to the normal register page

## Telegram

### Game notifications

- in the existing functionality for sending telegram notifications for new games, the user's telegram id should be used to send the notification to the correct user

## Authentifizierung

Login/Register

- Whatsapp Register

  - User klickt auf "Login with Whatsapp" Button
  - User bekommt Code per Whatsapp
  - User gibt Code im Formular ein und vergibt einen usernamen und passwort und klickt auf "Register"
  - User wird eingeloggt und auf die Startseite weitergeleitet

- Normal Register

  - User gibt einen usernamen und passwort im Formular ein und klickt auf "Register"
  - User wird eingeloggt und auf die Startseite weitergeleitet

- Login
  - User gibt seinen usernamen und passwort im Formular ein und klickt auf "Login"

Begründung:

- Nur Authentifizierte User können sich selbst aus Spielen entfernen
