import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { BaseRestService } from "src/app/core/services/base-rest.service";

@Injectable({
    providedIn:'root'
})
export class SampleService extends BaseRestService{
    constructor(http:HttpClient){
        super(http)
        this.setUri('todos')
    }


    getData():Observable<any>{
        return this.get('1')
    }
}