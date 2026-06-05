sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat"
], (Controller, MessageToast, JSONModel, DateFormat) => {
    "use strict";

    return Controller.extend("studies.firstui5project.controller.Main", {
        onInit() {
            this.loadItems();
            this.loadDateModel();
            this.loadModelProducts();
            this.loadModelCategories();
            this.loadModelOrders();
        },

        /* ---------- helpers para models ---------- */
        setViewModel(sName, oModel) {
            this.getView().setModel(oModel, sName);
        },

        getViewModelData(sName) {
            const oModel = this.getView().getModel(sName);
            return oModel ? oModel.getData() : undefined;
        },

        /* ---------- inicialização de models ---------- */
        async loadItems() {
            this._oListModel = new JSONModel({ items: [] });
            this.setViewModel("ProductList", this._oListModel);
        },

        async loadDateModel() {
            const today = new Date();
            const oDateFormat = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
            this._oDateModel = new JSONModel({ currentDate: oDateFormat.format(today) });
            this.setViewModel("FieldsDate", this._oDateModel);
        },

        /* ---------- carregar produtos ---------- */
        async loadModelProducts() {
            const oV4Model = this.getOwnerComponent().getModel("l2dProductsCatalog");
            if (!oV4Model) {
                console.warn("Model l2dProductsCatalog não encontrado no OwnerComponent.");
                return;
            }
            try {
                const oBinding = oV4Model.bindList("/Products");
                const aContexts = await oBinding.requestContexts();
                const aProducts = aContexts.map(ctx => ctx.getObject());
                // popula JSONModel com array de produtos na raiz
                this.setViewModel("products", new JSONModel(aProducts));
                console.log("Produtos carregados:", aProducts);
            } catch (err) {
                console.error("Erro ao carregar Products via bindList:", err);
            }
        },

        /* ---------- carregar categorias ---------- */
        async loadModelCategories() {
            const oV4Model = this.getOwnerComponent().getModel("l2dProductsCatalog");
            if (!oV4Model) {
                console.warn("Model l2dProductsCatalog não encontrado no OwnerComponent.");
                return;
            }
            try {
                const oBinding = oV4Model.bindList("/Categories");
                const aContexts = await oBinding.requestContexts();
                const aCategories = aContexts.map(ctx => ctx.getObject());
                this.setViewModel("categories", new JSONModel(aCategories));
                console.log("Categorias carregadas:", aCategories);
            } catch (err) {
                console.error("Erro ao carregar Categories via bindList:", err);
            }
        },

        /* ---------- carregar pedidos ---------- */
        async loadModelOrders() {
            const oV4Model = this.getOwnerComponent().getModel("l2dProductsCatalog");
            if (!oV4Model) {
                console.warn("Model l2dProductsCatalog não encontrado no OwnerComponent.");
                return;
            }
            try {
                const odataBindingList = oV4Model.bindList("/Orders", undefined, undefined, undefined, {
                    $expand: "product,category"
                });
                const contexts = await odataBindingList.requestContexts();
                const orders = contexts.map(ctx => {
                    const order = ctx.getObject();
                    return {
                        description: order.description,
                        price: order.price,
                        category: order.category?.name,
                        product: order.product?.name
                    };
                });
                this.setViewModel("orders", new JSONModel({ items: orders }));
            } catch (err) {
                console.error("Erro ao carregar Orders:", err);
            }
        },

        /* ---------- evento ao selecionar produto ---------- */
        onProductChange(oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) return;
            const sKey = oSelectedItem.getKey();
            const aProducts = this.getViewModelData("products") || [];
            const oProduct = aProducts.find(p => p.ID === sKey);
            const oValorInput = this.byId("_IDinputValor");
            if (oProduct && typeof oProduct.price === "number") {
                // preenche e bloqueia edição se o produto tiver preço
                oValorInput.setValue(oProduct.price);
                oValorInput.setEditable(false);
            } else {
                // libera edição se não houver preço no produto
                oValorInput.setValue("");
                oValorInput.setEditable(true);
            }
        },

        /* ---------- validações ---------- */
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

        /* ---------- adicionar pedido ---------- */
        onAddItemPress() {
            const produtoCombo = this.byId("_IDinputProduto");
            const valorInput = this.byId("_IDinputValor");
            const categoriaCombo = this.byId("_IDinputCategoria");

             // valida existência dos controles para evitar TypeError
            if (!produtoCombo || !categoriaCombo || !valorInput) {
                console.error("Controles não encontrados:", {
                produtoCombo: !!produtoCombo,
                categoriaCombo: !!categoriaCombo,
                valorInput: !!valorInput
                });
                MessageToast.show("Erro interno: controles não encontrados.");
                return;
            }

            const valorStr = valorInput.getValue().trim();
            const sProductId = produtoCombo ? produtoCombo.getSelectedKey() : "";
            const sCategoryId = categoriaCombo ? categoriaCombo.getSelectedKey() : "";

            const valorOk = this._validateFieldPrice(valorInput);
            
            if (!valorOk) return;

            if (!sCategoryId) {
                MessageToast.show("Selecione uma categoria.");
                return;
            }
            if (!sProductId) {
                MessageToast.show("Selecione um produto.");
                return;
            }

            const valor = Number(valorStr);
            const oModel = this.getOwnerComponent().getModel("l2dProductsCatalog");
            const odataBindingList = oModel.bindList("/Orders");

            const oPayload = {
                price: valor,
                quantity: 1,
                product_ID: sProductId,
                category_ID: sCategoryId
            };

            const newEntryContext = odataBindingList.create(oPayload);
            newEntryContext.created().then(() => {
                valorInput.setValue("");
                produtoCombo.setSelectedKey("");
                categoriaCombo.setSelectedKey("");
                MessageToast.show("Item adicionado!");
                this.loadModelOrders();
            }).catch((oError) => {
                MessageToast.show("Erro ao adicionar item: " + (oError.message || JSON.stringify(oError)));
            });
        },

        /* ---------- formatters ---------- */
        formatDate() {
            const date = new Date();
            return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
        },

        formatPrice(value) {
            let number = parseFloat(value);
            return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        },

        formatTitle(name, index) {
            const id = index + 1;
            return `Pedido #${id.toString().padStart(2, "0")}\n${name}`;
        }

    });
});
