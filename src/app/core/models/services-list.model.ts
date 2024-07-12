/** Model for the service list, which contains every possible service a dental clinic may offer **/
export interface ServiceListModel {
  label: string;
  services: ServiceModel[];
}

/** Model for the service list, fetched from the database, unprocessed, which contains every possible service a dental clinic may offer **/
export interface ServiceListAPIModel {
  label: string;
  services: string[];
}

/** Model for the array of services listed in the ServiceListModel **/
export interface ServiceModel {
  label: string;
  available?: boolean;
  searchLabel?: string;
}

/** A local service offered by the clinic [ tooth extraction, tooth filling, etc. ] **/
export interface ServiceTableItemModel {
  id: number;
  label: string;
  searchLabel?: string;
  price: number;
  custom: boolean;
  editing?: boolean;
}

/** Class for generating a new ServiceList based on the ServiceListModel **/
export class ServiceList implements ServiceListModel {
  label = '';
  services: ServiceModel[] = [];

  constructor(label: string = '', services: ServiceModel[] = []) {
    this.label = label;
    this.services = services;
  }
}

/** Class for generating a new Service based on the ServiceModel **/
export class Service implements ServiceModel {
  label = '';
  available?;
  searchLabel?;

  constructor(label: string = '', available?: boolean, searchLabel?: string) {
    this.label = label;
    this.available = available;

    if (available) {
      this.available = available;
    }

    if (searchLabel) {
      this.searchLabel = searchLabel;
    }
  }
}

/** Class for generating a new ServiceTableItem based on the ServiceTableItemModel **/
export class ServiceTableItem implements ServiceTableItemModel {
  id = -1;
  label = '';
  searchLabel?: string;
  price = 0;
  custom = false;
  editing?: boolean;

  constructor(id: number = -1, label: string = '', searchLabel?: string, price: number = 0, custom: boolean = false, editing?: boolean) {
    this.id = id;
    this.label = label;
    this.price = price;
    this.custom = custom;

    if (searchLabel !== undefined) {
      this.searchLabel = searchLabel;
    }

    if (editing !== undefined) {
      this.editing = editing;
    }
  }
}
