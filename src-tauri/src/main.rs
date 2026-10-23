// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn get_system_ping() -> String {
    "JARVIS Host Bus Online".into()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_system_ping])
        .run(tauri::generate_context!())
        .expect("error while running JARVIS application");
}
