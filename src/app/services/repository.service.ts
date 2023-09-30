import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Room } from 'livekit-client';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class RepositoryService {
serverUrl = environment.server_url;
http = inject(HttpClient)
constructor() {
}
getToken(roomName: string, participantName: string): Observable<any> {
  const passToServer = {
    'room_name': roomName,
    'participant_name': participantName
  };
  return this.http.post(this.serverUrl + 'get-token', passToServer);
}
createRoom(roomName:string): Observable<Room> {
  return this.http.get<Room>(this.serverUrl + 'room/create/' + roomName);
}

getRoom(roomName: string): Observable<Room> {
  return this.http.get<Room>(this.serverUrl + 'room/' + roomName);
}



}
