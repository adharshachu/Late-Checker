# Late Entry AI 🕒

A high-performance employee attendance analyzer that quickly identifies late arrivals from Excel data.

## Features

- **Smart Excel Parsing**: Automatically detects employee names and clock-in times.
- **Dynamic Dashboard**: Real-time stats for total employees, on-time arrivals, and late entries.
- **Summary Report**: Generates a formatted text summary ready to be copied and shared.
- **Modern UI**: Sleek, dark-themed interface with smooth animations and responsive design.
- **CSV Export**: Export late entry details for record-keeping.

## Quick Start

The project includes a `launch.bat` script that handles setup and runs the application for you.

1. **Double-click `launch.bat`** in the root directory.
2. The script will:
   - Check for Node.js (and help install it if missing).
   - Install all necessary dependencies automatically.
   - Start the local server and open the application in your browser.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4
- **Icons**: Lucide React
- **Excel Logic**: XLSX (SheetJS)
- **Styling**: Vanilla CSS + Tailwind utilities

## How it Works

The application applies a "Grace Period" rule:
- **Threshold**: Players are considered late if they clocked in after **9:31 AM**.
- **First Entry Only**: If an employee has multiple entries, only the earliest one is considered.

---

*Built with precision for streamlined HR reporting.*
