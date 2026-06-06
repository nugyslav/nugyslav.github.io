import { renderLibraryUI } from "./view.js";

export class DatabaseManager {
    constructor() {
        this.db = null;
    }

    initDatabase() {
        const request = indexedDB.open("MusicPlayerDB", 1);
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            database.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
        };
        
        request.onsuccess = (event) => {
            this.db = event.target.result;
            console.log("IndexedDB initialised.");
            
            renderLibraryUI(this);
        };
        
        request.onerror = (event) => {
            console.error("IndexedDB failed to open:", event.target.error);
        };
    }

    addSong(trackInstance) {
        const transaction = this.db.transaction(["songs"], "readwrite");
        const store = transaction.objectStore("songs");
        const request = store.add(trackInstance);
        
        request.onsuccess = () => {
            console.log(`Song "${trackInstance.title}" saved successfully.`);
            renderLibraryUI(this);
        };
    }

    deleteSong(songId) {        
        const transaction = this.db.transaction(["songs"], "readwrite");
        const store = transaction.objectStore("songs");
        const request = store.delete(songId);

        request.onsuccess = () => {
            console.log(`Song with ID ${songId} was successfully deleted.`);
            renderLibraryUI(this);
        };
        
        request.onerror = (event) => {
            console.error("Error while deleting song:", event.target.error);
        };
    }
}