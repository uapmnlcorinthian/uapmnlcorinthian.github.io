# http://uapmnlcorinthian.github.io/
# [UAP Manila Corinthian Chapter Website](https://uapmnlcorinthian.github.io)

---

## Project Overview

This project powers the official website of the **UAP Manila Corinthian Chapter (MCC)**, a premier community of architectural professionals in Manila.  
It provides members with secure login access to personalized account information, including membership status, payment history, and contact details.

---

## Features

- **Member Authentication**: Secure login via Supabase backend.  
- **Dynamic Account Dashboard**: View membership status, batch, company, position, and contact details.  
- **Payment History**: Displays detailed payment records with dynamic columns for multiple years.  
- **UI Enhancements**: Password visibility toggle, masked sensitive data by default with toggle option, and print/save membership info features.  
- **Responsive Design**: Powered by Bootstrap 5 for optimal display across devices.  
- **Iconography**: Utilizes FontAwesome 6 icons for clean, accessible visuals.

---

## Technologies Used

- **Supabase JavaScript SDK v2** – Backend database and authentication service  
- **Bootstrap 5** – Responsive UI framework  
- **FontAwesome 6** – Icon set for UI elements  
- **Vanilla JavaScript** – Core frontend logic  

---

## Installation & Setup

1. Ensure you have the necessary backend configured on Supabase with tables matching MCC membership data.  
2. Clone or download the repository.  
3. Serve the Jekyll-based site on a compatible server or locally via `jekyll serve`.  
4. Update Supabase URL and API key in the `js/common.js` file if necessary.

---

## Usage

- **Login Page**  
  - Enter username and password to authenticate.  
  - Password visibility toggle available.  
  - On successful login, user data is stored in `sessionStorage`.  

- **Account Page**  
  - Displays personalized member details and payment history.  
  - Sensitive data like PRC license and contact info masked by default; toggle icons reveal/hide.  
  - Payment history dynamically adapts to years available in the database.  
  - Print or save account information via dedicated buttons.

---

## Code Structure

- **js/common.js** – Core JavaScript handling login, session management, account data rendering, UI interactivity, and security measures.  
- **Layouts & Pages** – Jekyll templates organizing the HTML structure and styling.  

---

## Contribution Guidelines

This project is proprietary and intended for internal use by the UAP Manila Corinthian Chapter.  
For any contributions or modifications, please contact the author directly.

---

## Contact

- **Author**: ArZ Miranda  
- **Email**: uapmccmembership@gmail.com  
- **Website**: [https://manilacorinthianchapter.github.io/mcc/](https://manilacorinthianchapter.github.io/mcc/)

---

## License

Proprietary — for internal use only.

---

