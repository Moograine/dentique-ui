import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ServiceListService } from '../../../core/services/services-list.service';
import { ServiceTableItem, ServiceTableItemModel, ServiceListModel, ServiceModel, ServiceList, } from '../../../core/models/services-list.model';
import { MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { filter, Observable, switchMap, take, takeWhile, tap } from 'rxjs';
import { DoctorService } from '../../../core/services/doctor.service';
import { CurrencyType } from '../../../core/models/settings.model';

@Component({
  selector: 'app-services-table',
  templateUrl: './services-table.component.html',
  styleUrls: ['./services-table.component.scss'],
  providers: [MessageService]
})
export class ServicesTableComponent implements OnInit, OnDestroy {
  activeComponent = true;
  showAllServicesDialog = false;
  showCustomServiceDialog = false;
  showConfirmDialog = false;
  editedTableItemIndex = -1;
  previousPriceValue = -1;
  searchInput = '';

  /** Preferred currency **/
  currency: CurrencyType = 'eur';

  newCustomService: ServiceTableItem = new ServiceTableItem(-1, '', undefined, -0, true);

  /** An array containing a vast amount of services offered by dental clinics worldwide. While the user has the ability to add custom services, this
   * list is for helping the user in the process of constructing the tableItems **/
  servicesList: ServiceListModel[] = [];

  /** A clone of the servicesList, for comparison purposes **/
  originalServicesList: ServiceListModel[] = [];

  /** A clone of the servicesList, purely for display & search purposes **/
  displayedServiceList: ServiceListModel[] = [];

  /** An array of available services offered by this clinic. Items are either added by the user, with a custom name, or picked from
   * the displayedServicesList. If an item is added with a custom name, the property 'custom' will have a value set to true. Items will also include
   * ID, price, and finally a boolean property 'editing' which is for keeping track whether the current item is in edit mode. **/
  tableItems: ServiceTableItemModel[] = [];

  constructor(private router: Router,
              private servicesListService: ServiceListService,
              private messageService: MessageService,
              private doctorService: DoctorService,
              private translateService: TranslateService) {
  }

  /** Function to trigger initializing list of services **/
  ngOnInit() {
    this.initializeServices();
    this.initializePreferredCurrency();
  }

  /** Function to assign value of prefetched available services offered by this clinic, based on Subject in .service file, then get the list
   * of all services. As soon as the availableServices are fetched, they are assigned to this.tableItems and as soon as the allServices are fetched,
   * they are mapped into objects, where the boolean property 'available' is added, for the ability to add/remove services from the list of all
   * possible services used worldwide **/
  initializeServices(): void {
    this.servicesListService.availableServiceFetch().pipe(
      filter((availableServices: ServiceTableItemModel[]) => availableServices.length > 0), /* Ensure only non-empty values pass through */
      take(1),
      takeWhile(() => this.activeComponent),
      switchMap((availableServices: ServiceTableItemModel[]): Observable<ServiceListModel[]> => {
        this.tableItems = availableServices;
        return this.servicesListService.getAllServices(availableServices);
      }),
      tap((allServices: ServiceListModel[]) => {
        this.servicesList = allServices;
        this.displayedServiceList = allServices;
      })).subscribe((): void => {
    }, () => {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.generic_error')
      });
    });
  }

  /** Function to initialize the preferred currency based on the doctor's settings **/
  initializePreferredCurrency(): void {
    this.doctorService.currencyFetch().pipe(
      filter((currency: CurrencyType) => currency.length > 0), /* Ensure only non-empty values pass through */
      take(2), /* First emitted value is the default value, which in this case is a non-empty string, so filter wil let it pass */
      takeWhile(() => this.activeComponent)).subscribe((currency: CurrencyType) => {
      this.currency = currency;
    });
  }

  /** Function which checks if any services' availability was changed in the displayedServiceList **/
  isDisplayedServiceListChanged(): boolean {
    return JSON.stringify(this.servicesList) !== JSON.stringify(this.originalServicesList);
  }

  /** Function for determining what changes were made for the displayedServiceList.
   * Returns two arrays of services, an array of removed services and array of added services **/
  changeListForDisplayedServices(): ServiceModel[] {
    let changedServices: ServiceModel[] = [];

    for (let groupIndex = 0; groupIndex < this.servicesList.length; groupIndex++) {
      const group = this.servicesList[groupIndex].services;
      const originalGroup = this.originalServicesList[groupIndex].services;
      for (let serviceIndex = 0; serviceIndex < group.length; serviceIndex++) {
        if (group[serviceIndex].available !== originalGroup[serviceIndex].available) {
          changedServices.push(group[serviceIndex]);
        }
      }
    }
    return changedServices;
  }

  /** Function to save a manually entered custom service in the list of
   * available services. Save will be aborted if the entered ID is already taken **/
  saveCustomService(): void {
    /* Check if the label contains at least 3 characters */

    if (this.newCustomService.label.length < 3) {
      this.messageService.add({
        severity: 'info',
        summary: this.translateService.instant('notifications.invalid'),
        detail: this.translateService.instant('notifications.label_minimum_3_characters')
      });

      return;
    }

    let isDuplicateID = false;
    let isDuplicateLabel = false;
    this.tableItems.forEach(service => {
      /* Check if the ID is already registered to another service [ if its value isn't the default -1 ] */
      if (this.newCustomService.id !== -1 && service.id === this.newCustomService.id) {
        isDuplicateID = true;
        return;
      }

      /* Check if the label is already registered to another service */
      if (this.newCustomService.label === service.label) {
        isDuplicateLabel = true;
        return;
      }
    });

    if (isDuplicateID) {
      this.messageService.add({
        severity: 'info',
        summary: this.translateService.instant('notifications.invalid'),
        detail: this.translateService.instant('notifications.duplicate_id')
      });

      return;
    }

    if (isDuplicateLabel) {
      this.messageService.add({
        severity: 'info',
        summary: this.translateService.instant('notifications.invalid'),
        detail: this.translateService.instant('notifications.duplicate_label')
      });

      return;
    }

    /* Make sure price is formatted as number */
   this.newCustomService.price = parseFloat(String(this.newCustomService.price));

    const modifiedTableItems = this.servicesListService.cloneAvailableServices(this.tableItems);
    modifiedTableItems.push(this.newCustomService);

    this.servicesListService.updateAvailableServices(modifiedTableItems).pipe(takeWhile(() => this.activeComponent)).subscribe(() => {
      this.tableItems.push(this.newCustomService);
      this.newCustomService = new ServiceTableItem(-1, '', undefined, 0, true);
      this.closeCustomServiceDialog();
      this.messageService.add({
        severity: 'success',
        summary: this.translateService.instant('notifications.success'),
        detail: this.translateService.instant('notifications.saved')
      });
    }, () => {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.generic_error')
      });
    });
  }

  /** Function to update the list of all available services **/
  updateAvailableServices(): void {
    if (!this.isDisplayedServiceListChanged()) {
      this.closeAllServicesDialog();
      return;
    }

    const changedServices = this.changeListForDisplayedServices();
    let modifiedTableItems = this.servicesListService.cloneAvailableServices(this.tableItems);
    changedServices.forEach(service => {
      /* If the changed service has a truthy availability, add it to the displayed tableItems, else remove it */
      if (service.available) {
        modifiedTableItems.push(new ServiceTableItem(-1, service.label, this.translateService.instant('services_list.' + service.label)));
      } else {
        modifiedTableItems = modifiedTableItems.filter(tableItem => service.label !== tableItem.label);
      }
    });

    this.servicesListService.updateAvailableServices(modifiedTableItems).pipe(takeWhile(() => this.activeComponent)).subscribe(() => {
      this.tableItems = modifiedTableItems;
      this.cloneServiceList();
      this.closeAllServicesDialog();
      this.messageService.add({
        severity: 'success',
        summary: this.translateService.instant('notifications.success'),
        detail: this.translateService.instant('notifications.saved')
      });
    }, () => {
      this.resetServiceListToOriginal();
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.generic_error')
      });
    });
  }

  /** Function to reset servicesList to its previous, unaltered version **/
  resetServiceListToOriginal(): void {
    this.servicesList = this.servicesListService.cloneAllServices(this.originalServicesList);
    this.displayedServiceList = this.servicesList;
    this.searchInput = '';
  }

  /** Function to clone servicesList into originalServicesList **/
  cloneServiceList(): void {
    this.originalServicesList = this.servicesListService.cloneAllServices(this.servicesList);
  }

  /** Function to activate edit mode for table item **/
  editServiceTableItem(tableItem: ServiceTableItem, index: number): void {
    /* Make sure no other item is being edited */
    this.abortEditing();

    /* Enable editing for the service */
    tableItem.editing = true;

    /* Assign previous index and price value */
    this.previousPriceValue = tableItem.price;
    this.editedTableItemIndex = index;
  }

  /** Function to activate edit mode for table item **/
  deleteServiceTableItem(serviceIndex: number): void {
    let modifiedTableItems = this.servicesListService.cloneAvailableServices(this.tableItems);
    modifiedTableItems.splice(serviceIndex, 1);
    this.resetPreviousIndicators(); /* Reset previous index and price */
    this.servicesListService.updateAvailableServices(modifiedTableItems).pipe(takeWhile(() => this.activeComponent)).subscribe(() => {
      this.closeConfirmDialog();

      /* Update the checkbox list of all services for non-custom services */
      if (!this.tableItems[serviceIndex].custom) {
        outerLoop: for (let serviceGroup of this.servicesList) {
          for (let service of serviceGroup.services) {
            if (service.label === this.tableItems[serviceIndex].label) {
              service.available = false;
              break outerLoop;
            }
          }
        }
      }

      this.tableItems = modifiedTableItems;
      this.messageService.add({
        severity: 'success',
        summary: this.translateService.instant('notifications.success'),
        detail: this.translateService.instant('notifications.deleted')
      });
    }, () => {
      this.resetServiceListToOriginal();
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.generic_error')
      });
    });
  }

  /** Function to set an empty string value for the search input variable **/
  clearSearchInput(): void {
    this.searchInput = '';
    this.displayedServiceList = this.servicesList;
  }

  /** Function to modify displayed service list based on search input **/
  filterServiceList(searchInput: string): void {
    if (searchInput.length < 2) {
      this.displayedServiceList = this.servicesList;
      return;
    }

    this.displayedServiceList = this.servicesList
      .map(serviceGroup => {
        const filteredServices = serviceGroup.services.filter(service =>
          service.searchLabel?.toLowerCase().includes(searchInput.toLowerCase())
        );

        if (filteredServices.length > 0) {
          return {
            label: serviceGroup.label,
            services: filteredServices
          };
        }
        return new ServiceList();
      })
      .filter(serviceGroup => serviceGroup.label.length !== 0);
  }

  /** Function to navigate back to settings component **/
  navigateBackToSettings(): void {
    this.router.navigate(['settings']).then();
  }

  /** Function to handle autofocusing input **/
  focusNextInput(input: HTMLInputElement): void {
    input.focus();
  }

  /** Function to display dialog for creating a custom service **/
  displayCustomServiceDialog(): void {
    this.showCustomServiceDialog = true;
    this.abortEditing();
  }

  /** Function to hide custom service dialog **/
  closeCustomServiceDialog(): void {
    this.showCustomServiceDialog = false;
  }

  /** Function to display dialog with all recorded treatments **/
  displayAllServicesDialog(): void {
    this.showAllServicesDialog = true;
    this.abortEditing();
    this.cloneServiceList();
  }

  /** Function to hide dialog with all recorded treatments **/
  closeAllServicesDialog(): void {
    this.showAllServicesDialog = false;
  }

  /** Function to close the confirm dialog by setting the showConfirmDialog to false **/
  closeConfirmDialog(): void {
    this.showConfirmDialog = false;
  }

  /** Function to display confirmation dialog for deleting a table item **/
  displayConfirmDialog(index: number) {
    this.editedTableItemIndex = index;
    this.showConfirmDialog = true;
  }

  /** Function to finish editing the table item and save the new value of the price **/
  finishEditing(service: ServiceTableItem, index: number): void {
    /* Return early if price and previousPriceValue are equal, as no changes were made that should be saved in the DB */
    if (service.price === this.previousPriceValue) {
      service.editing = false;
      this.resetPreviousIndicators();
      return;
    }

    /* Make sure price is formatted as number */
    service.price = parseFloat(String(service.price));

    this.servicesListService.updatePriceOfService(index, service.price).pipe(takeWhile(() => this.activeComponent)).subscribe(() => {
      service.editing = false;
      this.resetPreviousIndicators();
      this.messageService.add({
        severity: 'success',
        summary: this.translateService.instant('notifications.success'),
        detail: this.translateService.instant('notifications.saved')
      });
    }, () => {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.generic_error')
      });
    });
  }

  /** Function to trigger and display tooltip in the UI **/
  showTooltip(event: Event, tooltip: HTMLElement): void {
    event.stopPropagation();
    tooltip.focus();
  }

  /** Function to hide tooltip **/
  hideTooltip(event: Event, tooltip: HTMLElement): void {
    tooltip.blur();
  }

  /** Function to reset previous service index and price **/
  resetPreviousIndicators(): void {
    this.editedTableItemIndex = -1;
    this.previousPriceValue = -1;
  }

  /** Function to abort any ongoing editing **/
  abortEditing(): void {
    if (this.editedTableItemIndex !== -1 && this.tableItems[this.editedTableItemIndex]) {
      this.tableItems[this.editedTableItemIndex].editing = false;
      if (this.previousPriceValue !== -1) {
        this.tableItems[this.editedTableItemIndex].price = this.previousPriceValue;
      }
    }
  }

  /** When the component is destroyed, any ongoing editing will be
   * aborted, the available services [ this.tableItems ] saved in the BehaviorSubject,
   * and the 'activeComponent' boolean will be set to false, to make sure every subscription is destroyed **/
  ngOnDestroy() {
    this.abortEditing();
    this.servicesListService.updateAvailableServicesSubject(this.tableItems);
    this.activeComponent = false;
  }
}
