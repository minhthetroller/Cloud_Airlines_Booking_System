<div align="center">
  <h1 align="left">Cloud Airline Booking System (CABS) ✈️</h1>
  <p align="left">
    A modern, full-stack flight booking application built with Next.js, TypeScript, and Supabase.
  </p>
</div>

---

## 📖 About The Project

**Cloud Airline Booking System (CABS)** is a web application that simulates a real-world airline booking platform. It allows users to search for domestic flights, select seats from an interactive map, and complete their booking as either a guest or a registered member.

This project was developed as a practical application of system analysis, design, and implementation principles, focusing on a modern, serverless-first architecture to ensure a great user experience and developer productivity.

### ✨ Key Features

* **Flight Search**: Search for one-way or round-trip domestic flights based on destination and date.
* **Interactive Seat Selection**: Visually select available seats from an aircraft map based on the chosen ticket class.
* **Secure User Authentication**: Full registration and login system for members, powered by Supabase Auth.
* **Booking Management**: Members can view their complete booking history and cancel upcoming trips.
* **Transactional Emails**: Automated booking confirmations and password reset emails are handled by Resend.
* **Responsive Design**: A clean and intuitive UI that works seamlessly across desktop, tablet, and mobile devices.

---

## 🛠️ Tech Stack

This project leverages a powerful and modern tech stack for a scalable, serverless application:

* **Framework**: **Next.js**
* **Language**: **TypeScript**
* **Backend & Database**: **Supabase** (PostgreSQL, Auth, Auto-generated APIs)
* **Transactional Emails**: **Resend**
* **Styling**: **Tailwind CSS**
* **UI/UX Design**: **Figma**

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

* Node.js (v18 or later)
* npm or yarn
* A Supabase account and project
* A Resend account and API key

### Installation

1.  **Clone the repo**
    ```sh
    git clone [https://github.com/your_username/cabs-booking-system.git](https://github.com/your_username/cabs-booking-system.git)
    ```
2.  **Install NPM packages**
    ```sh
    npm install
    ```
3.  **Set up environment variables**
    * Create a `.env.local` file in the root of the project.
    * Add your Supabase Project URL, Anon Key, and Resend API Key.
        ```env
        NEXT_PUBLIC_SUPABASE_URL='YOUR_SUPABASE_URL'
        NEXT_PUBLIC_SUPABASE_ANON_KEY='YOUR_SUPABASE_ANON_KEY'
        RESEND_API_KEY='YOUR_RESEND_API_KEY'
        ```
4.  **Run the development server**
    ```sh
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

##  STATUS

This project was created for academic purposes as part of the **System Analysis and Design** curriculum at the **Hanoi University of Civil Engineering (HUCE)**.
