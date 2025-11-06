# 🧁 RealOrCake — Aplikacja do Badań Percepcyjnych

RealOrCake to prosta, samodzielna aplikacja webowa stworzona do przeprowadzania badań percepcyjnych. Jej głównym celem jest zbieranie od użytkowników subiektywnych ocen realizmu (**w skali 1-5**) krótkich, **5-sekundowych klipów wideo**.

Projekt został napisany w lekkim stosie technologicznym (PHP + SQLite), aby umożliwić łatwe wdrożenie i minimalne wymagania serwerowe.

## 🎯 Główne Założenia i Funkcje

* **Przepływ Badania:** Aplikacja prowadzi użytkownika przez prosty, trójetapowy proces:
    1.  **Start:** Strona powitalna z instrukcjami (`/index.php`).
    2.  **Ocenianie:** Player wideo, który po kolei wyświetla 5-sekundowe klipy i zbiera oceny w skali ACR 1-5.
    3.  **Koniec:** Strona z podziękowaniem za udział (`/thanks.php`).
* **Zbieranie Danych:** Każda ocena jest powiązana z anonimowym identyfikatorem użytkownika i zapisywana w lokalnej bazie danych SQLite.
* **Zarządzanie Treścią:** Wystarczy wgrać pliki wideo (np. `.mp4`) do odpowiedniego katalogu, a skrypt inicjujący automatycznie doda je do bazy.
* **Szybkie Wdrożenie:** Całość jest skonteneryzowana przy użyciu Docker, co pozwala na uruchomienie badania jednym poleceniem.

---

## 🛠️ Stos Technologiczny

Aplikacja została zbudowana przy użyciu następujących technologii:

* **Backend:** **PHP 8.x** (logika aplikacji i proste API)
* **Baza Danych:** **SQLite** (lekka, plikowa baza danych do przechowywania ocen)
* **System Szablonów:** **Twig** (do renderowania widoków HTML po stronie serwera)
* **Frontend:** Czysty **CSS** (`css/site.css`) i minimalny JavaScript (do obsługi playera i API)
* **Zarządzanie Zależnościami:** **Composer**
* **Środowisko:** **Docker** i **Docker Compose** (dla łatwego, spójnego uruchomienia)

---

## 🚀 Uruchomienie (Zalecane: Docker)

Najprostszym sposobem na uruchomienie aplikacji jest skorzystanie z dołączonej konfiguracji Docker Compose.

### Wymagania

* Zainstalowany [Docker](https://www.docker.com/get-started)
* Zainstalowany [Docker Compose](https://docs.docker.com/compose/install/)

### Kroki

1.  **Zbuduj i uruchom kontenery:**
    W głównym katalogu projektu wykonaj polecenie:

    ```bash
    docker-compose up --build -d
    ```

2.  **Zainicjuj bazę danych:**
    To polecenie tworzy plik bazy `data/database.sqlite` i wczytuje do niej listę plików wideo z katalogu `videos/Test`.

    ```bash
    docker-compose exec web php init_db.php
    ```

3.  **Gotowe!**
    Aplikacja badawcza jest dostępna pod adresem: **`http://localhost:8000`**

---

## 📂 Struktura Projektu

Najważniejsze pliki i katalogi w projekcie:

```plaintext
.
├── api/                # Endpointy PHP (user.php, videos.php, rate.php)
├── css/                # Style (site.css)
├── data/               # Miejsce na bazę danych (data/database.sqlite)
├── templates/          # Szablony Twig (index.html, player.html, thanks.html)
├── videos/             # Katalog na klipy wideo (np. videos/Test/)
│
├── index.php           # Strona startowa
├── player.php          # Strona z playerem i ocenianiem
├── thanks.php          # Strona z podziękowaniem
│
├── init_db.php         # Skrypt do inicjalizacji/wypełniania bazy danych
├── composer.json       # Zależności PHP (Twig, etc.)
└── docker-compose.yml  # Definicja kontenera Docker
```