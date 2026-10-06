import type { Banknote, BanknoteFormData } from '../types/banknote';

export function note(partial: Partial<Banknote> & Pick<Banknote, 'id'>): Banknote {
  return {
    collectionId: 'col',
    collectionName: 'banknotes',
    userId: 'user-1',
    noteType: 'world',
    country: 'France',
    countryCode: 'fr',
    pickNumber: '1',
    faceValue: 10,
    currency: 'Franc',
    isRangeOfYearOfIssue: false,
    pmgCert: '',
    grade: '65',
    pmgComments: '',
    isEpq: false,
    isSpecimen: false,
    serialNumber: '',
    watermark: '',
    purchasePriceCurrency: 'USD',
    purchasePrice: 0,
    dateOfPurchase: '',
    isVisibleInCollection: true,
    isFeatured: false,
    obverseImage: '',
    reverseImage: '',
    ...partial,
  };
}

export function formValues(partial: Partial<BanknoteFormData> = {}): BanknoteFormData {
  return {
    noteType: 'world',
    country: 'France',
    countryCode: 'fr',
    pickNumber: '1',
    faceValue: 10,
    currency: 'Franc',
    isRangeOfYearOfIssue: false,
    pmgCert: '',
    grade: '65',
    pmgComments: '',
    isEpq: false,
    isSpecimen: false,
    serialNumber: '',
    watermark: '',
    purchasePriceCurrency: 'USD',
    purchasePrice: 0,
    dateOfPurchase: '',
    isVisibleInCollection: true,
    isFeatured: false,
    ...partial,
  };
}
