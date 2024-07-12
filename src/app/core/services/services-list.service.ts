import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable } from 'rxjs';
import { Service, ServiceList, ServiceListAPIModel, ServiceListModel, ServiceTableItem, ServiceTableItemModel } from '../models/services-list.model';
import { Environment } from '../environments/environment';
import { ComponentType, ErrorLog, ErrorLogModel } from '../models/maintenance.model';
import { MaintenanceService } from './maintenance.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})

export class ServiceListService {
  availableServicesSubject: BehaviorSubject<ServiceTableItemModel[]> = new BehaviorSubject<ServiceTableItemModel[]>([]);

  constructor(private http: HttpClient, private translateService: TranslateService, private maintenanceService: MaintenanceService) {
  }

  /** Function to map the list of available services based on whether the
   * data is fetched from the database or being prepared to be saved in the database.
   * When fetched, an available service item will have an 'id', 'label', 'searchLabel', 'price', 'custom'
   * and 'editing', while on the contrary, when being saved, it will only have 'id', 'label', 'price' and 'custom' **/
  mapAvailableServices(availableServices: ServiceTableItemModel[], action: 'fetch' | 'save'): ServiceTableItemModel[] {
    const editing = action === 'fetch' ? false : undefined;
    return availableServices.map(service => {
        const searchLabel = action === 'fetch' ?
          (service.custom ? service.label : this.translateService.instant('services_list.' + service.label)) : undefined;
        return new ServiceTableItem(
          service.id,
          service.label,
          searchLabel,
          service.price,
          service.custom,
          editing
        )
      }
    );
  }

  /** Function to map the list of all services, into an array of ServiceListModel items, which have 'label',
   * 'available' and 'searchLabel' properties. This list can only be fetched, it cannot be modified in the application **/
  mapAllServices(allServices: ServiceListAPIModel[], availableServices: ServiceTableItemModel[]): ServiceListModel[] {
    return allServices.map(serviceGroup => new ServiceList(
        serviceGroup.label,
        serviceGroup.services.map(service => {
          let available = false;
          availableServices.forEach(availableService => {
            if (availableService.label === service) {
              available = true;
            }
          });

          return new Service(service, available, this.translateService.instant('services_list.' + service));
        })
      )
    );
  }

  /** Function to clone the array of all service **/
  cloneAllServices(mappedServices: ServiceListModel[]): ServiceListModel[] {
    return mappedServices.map(serviceGroup => new ServiceList(
      serviceGroup.label,
      serviceGroup.services.map(service =>
        new Service(service.label, service.available, service.searchLabel))
    ));
  }

  /** Function to clone an array of available services, displayed in the Table **/
  cloneAvailableServices(availableServices: ServiceTableItemModel[]): ServiceTableItemModel[] {
    return availableServices.map(service => new ServiceTableItem(
      service.id,
      service.label,
      service.searchLabel,
      service.price,
      service.custom,
      service.editing
    ));
  }

  /** Function to get the current value snapshot of the available services Subject **/
  getAvailableServicesSubjectValue(): ServiceTableItemModel[] {
    return this.availableServicesSubject.getValue();
  }

  /** Function to update the available services Subject **/
  updateAvailableServicesSubject(availableServices: ServiceTableItemModel[]): void {
    this.availableServicesSubject.next(availableServices);
  }

  /** Function which returns an Observable based on the availableServicesSubject, which takes its data from the getAllServices() */
  availableServiceFetch(): Observable<ServiceTableItemModel[]> {
    return <Observable<ServiceTableItemModel[]>>this.availableServicesSubject.pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while listening to the AllServicesSubject changes', error, ComponentType.servicesListService, '24');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  /** Function to make a request to the DB and return an Observable with an array of all dental services offered worldwide **/
  getAllServices(availableServices: ServiceTableItemModel[]): Observable<ServiceListModel[]> {
    return <Observable<ServiceListModel[]>>this.http.get<ServiceListAPIModel[]>(`${Environment.defaultAPI}/configuration/allServices.json`).pipe(
      map(allServices => this.mapAllServices(allServices, availableServices)),
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while fetching list of all services.', error, ComponentType.servicesListService, '30');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  /** Function to make a request to the DB and return an Observable with an array of the available services offered by the clinic **/
  getAvailableServices(): Observable<ServiceTableItemModel[]> {
    return <Observable<ServiceTableItemModel[]>>this.http.get<ServiceTableItemModel[]>(`${Environment.defaultAPI}/configuration/availableServices.json`).pipe(
      map(availableServices => this.mapAvailableServices(availableServices, 'fetch')),
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while fetching list of available services.', error, ComponentType.servicesListService, '40');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  /** Function which takes the index of a service item from the service table, and the updated price, then updates the data in Database **/
  updatePriceOfService(serviceIndex: number, price: number): Observable<ServiceTableItemModel> {
    return <Observable<ServiceTableItemModel>>this.http.put<ServiceTableItemModel>
    (`${Environment.defaultAPI}/configuration/availableServices/${serviceIndex}/price.json`, price).pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while updating the price of service.', error, ComponentType.servicesListService, '113');
        return this.maintenanceService.sendErrorLog(errorLog).pipe(
        );
      })
    );
  }

  /** Function which takes an array of ServiceTableItems and sends it to the
   * database to be saved as the list of available services offered by the clinic **/
  updateAvailableServices(updatedListOfServices: ServiceTableItemModel[]) {
    const availableServices = this.mapAvailableServices(updatedListOfServices, 'save');
    return <Observable<ServiceTableItemModel[]>>this.http.put<ServiceTableItemModel[]>
    (`${Environment.defaultAPI}/configuration/availableServices.json`, availableServices).pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while updating the list of available services.', error, ComponentType.servicesListService, '73');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }
}
