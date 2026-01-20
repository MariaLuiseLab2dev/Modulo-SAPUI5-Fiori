sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat"
], (Controller,
	MessageToast,
	JSONModel,
	DateFormat) => {
    "use strict";

    return Controller.extend("studies.firstui5project.controller.Main", {
        onInit() {
            this._oListModel = new JSONModel({
                items: []
            });
            this.getView().setModel(this._oListModel, "ProductList");

            const today = new Date();
            console.log("\nTODAY  :" +today);

            // pega a instância da data e coloca no padrão que o input type=date aceita
            const oDateFormat = DateFormat.getDateInstance({pattern: "yyyy-MM-dd"}); 
            console.log("\noDateFormat : " + oDateFormat.format(today));

            this._oDateModel = new JSONModel({
                currentDate: oDateFormat.format(today)
            }
            );

            this.getView().setModel(this._oDateModel, "FieldsDate");
        },

        formatDate() {
            const date = new Date();
            return date.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
        },
        formatPrice(value) {
            if (!value) {
                console.log(`[ERROR] Campo Valor vazio: [${value}]`);
                return "";
            }

            let number = parseFloat(value);

            if (isNaN(number)) {
                console.log(`[ERROR] Valor inválido: [${number}]`);
                return "";
            }

            return number.toLocaleString(
                "pt-BR",
                {
                    style: "currency",
                    currency: "BRL"
                }
            );
        },

        formatTitle(name, index) {
            const id = index + 1; 
            return `Pedido #${id.toString().padStart(2, "0")}\n${name}`; 
        },

        _validateFieldName(oInput) {
            const value = oInput.getValue().trim();
            if (!value) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Nome obrigatório");
                return false;
            }
            oInput.setValueState("None");
            return true;
        },

        _validateFieldPrice(oInput) {
            const value = oInput.getValue().trim();
            if (!value) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Valor obrigatório");
                return false;
            }

            const number = Number(value);
            if (isNaN(number) || number <= 0) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Digite um valor válido");
                return false;
            }
            oInput.setValueState("None");
            return true;
        },

        onAddItemPress() {
            const nomeInput = this.byId("_IDinputNome");
            const valorInput = this.byId("_IDinputValor");
            const dataInput = this.byId("_IDinputData");

            const nome = nomeInput.getValue().trim(); 
            const valor = valorInput.getValue().trim(); 
            const data = new Date();

            const nomeOk = this._validateFieldName(nomeInput);
            const valorOk = this._validateFieldPrice(valorInput);

            if (!nomeOk || !valorOk) {
                return;
            }

            const items = this._oListModel.getProperty("/items");
            const index = items.length;
            console.log("\nINDEX: ", index);
            items.push({ name: nome, valor: valor, data: data, index: index});
            this._oListModel.setProperty("/items", items);

            nomeInput.setValue("");
            valorInput.setValue("");
            MessageToast.show(`Item ${nome} adicionado!`);
        }

    });
});