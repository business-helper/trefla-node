const TreflaType = require('./TreflaType');

class CardPayment extends TreflaType {
  constructor(data = null) {
    super();
    data = data || {};
    const { name, iban, swift, receiver_name } = data;
    this.name = name;
    this.iban = iban;
    this.swift = swift;
    this.receiver_name = receiver_name;
  }
}

class BankPayment extends TreflaType {
  constructor(data = null) {
    super();
    data = data || {};
    const { name, card_number, expire_date, cvv } = data;
    this.name = name;
    this.card_number = card_number;
    this.expire_date = expire_date;
    this.cvv = cvv;
  }
}

class PayPalPayment extends TreflaType {
  constructor(data = null) {
    super();
    data = data || null;
    const { email } = data;
    this.email = email;
  }
}

class Payments extends TreflaType {
  constructor(data = {}) {
    super();
    const { bank, card, paypal } = data;
    this.bank = new BankPayment(bank || {});
    this.card = new CardPayment(card || {});
    this.paypal = new PayPalPayment(paypal || {});
  }
}

module.exports = Payments;
