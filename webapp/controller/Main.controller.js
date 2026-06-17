sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment"
], (Controller, MessageToast, JSONModel, DateFormat, Filter, FilterOperator, Fragment) => {
    "use strict";

    return Controller.extend("studies.firstui5project.controller.Main", {
        onInit() {
            this.loadItems();
            this.loadDateModel();
            this.loadModelProducts();
            this.loadModelCategories();
            this.loadModelOrders();
            this.loadModelClients();
        },

        /**
        * Tenta localizar um controle em uma lista de fragments (por ordem).
        * Retorna o primeiro controle encontrado ou undefined.
        * Uso: const o = this._findControlInFragments(["OrdersFrag","OrdersDialogFrag"], "_IDinputValor");
        */
        _findControlInFragments(aFragBaseNames, sControlId) {
            for (let i = 0; i < aFragBaseNames.length; i++) {
                const sFragId = this.createId(aFragBaseNames[i]);
                const oControl = Fragment.byId(sFragId, sControlId);
                if (oControl) return oControl;
            }
            return undefined;
        },

        onTabSelect(oEvent) {
            const sKey = oEvent.getParameter("key");
            // atualiza model de UI se estiver usando {/activeTab}
            const oViewModel = this.getView().getModel();
            if (oViewModel) {
                oViewModel.setProperty("/activeTab", sKey);
            }

            // carrega fragment correspondente (lazy)
            switch (sKey) {
                case "orders":
                    this._loadFragment("Orders", "ordersContent");
                    break;
                case "products":
                    this._loadFragment("Products", "productsContent");
                    break;
                case "categories":
                    this._loadFragment("Categories", "categoriesContent");
                    break;
                case "clients":
                    this._loadFragment("Clients", "clientsContent");
                    break;
            }
        },

        /* ---------- carregar fragment com id prefixado e lazy load ---------- */
        async _loadFragment(name, containerId) {
            const oContainer = this.byId(containerId);
            if (!oContainer) return;

            // evita recarregar se já inserido
            if (oContainer.getItems && oContainer.getItems().length > 0) return;

            const sFull = `studies.firstui5project.view.fragments.${name}`;
            // cria um id único prefixado pela view
            const sFragId = this.createId(name + "Frag");

            // carrega o fragment com id para prefixar todos os controles internos
            const oFragment = await Fragment.load({
                id: sFragId,
                name: sFull,
                controller: this
            });

            this.getView().addDependent(oFragment);

            // insere o fragment no container (VBox)
            if (Array.isArray(oFragment)) {
                oFragment.forEach(f => {
                    if (oContainer.addItem) oContainer.addItem(f);
                    else oContainer.addContent(f);
                });
            } else {
                if (oContainer.addItem) oContainer.addItem(oFragment);
                else oContainer.addContent(oFragment);
            }
        },

        async loadModelClients() {
            const model = this.getOwnerComponent().getModel("l2dProductsClient");
            const data = await new Promise((resolve, reject) => {
                model.read("/Clients", {
                    success: (data) => {
                        resolve(data.results);
                    },
                    error: (error) => {
                        reject(error);
                    }
                });
            });

            this.getView().setModel(new JSONModel({
                clients: data
            }));
        },

        onEditClient(oEvent) {
            // pega o contexto do item clicado
            const oContext = oEvent.getSource().getBindingContext();
            const oData = oContext.getObject();

            // guarda o ID para usar no update/delete
            this._sEditingClientId = oData.ID;
            console.log("Cliente selecionado:", oData);

            // abre o diálogo de edição
            this._openClientsDialog().then(() => {
                const sFragId = this.createId("ClientsDialogFrag");
                Fragment.byId(sFragId, "_IDinputClientNameDialog").setValue(oData.name);
                Fragment.byId(sFragId, "_IDinputClientPostalDialog").setValue(oData.postalCode);
            });
        },

        async _openClientsDialog() {
            this._dialogs = this._dialogs || {};
            const sFragId = this.createId("ClientsDialogFrag");

            if (!this._dialogs["ClientsDialog"]) {
                this._dialogs["ClientsDialog"] = await Fragment.load({
                    id: sFragId,
                    name: "studies.firstui5project.view.fragments.ClientsDialog",
                    controller: this
                });
                this.getView().addDependent(this._dialogs["ClientsDialog"]);
            }
            this._dialogs["ClientsDialog"].open();
        },

        onAddClient() {
            const sFragId = this.createId("ClientsFrag");
            const oNameInput = Fragment.byId(sFragId, "_IDclientNameInput");
            const oPostalInput = Fragment.byId(sFragId, "_IDclientPostalCodeInput");

            if (!oNameInput || !oPostalInput) {
                console.error("Controles de nome ou postal não encontrados no fragment ClientsFrag.");
                MessageToast.show("Erro interno: campos não encontrados.");
                return;
            }

            const sName = oNameInput.getValue().trim();
            const sPostal = oPostalInput.getValue().trim();

            if (!sName) {
                MessageToast.show("Por favor, informe o nome do cliente.");
                return;
            }

            if (!sPostal) {
                MessageToast.show("Por favor, informe o CEP do cliente.");
                return;
            }

            const oModel = this.getOwnerComponent().getModel("l2dProductsClient");
            const oPayload = {
                name: sName,
                postalCode: sPostal
            };
            oModel.create("/Clients", oPayload, {
                success: () => {
                    MessageToast.show("Cliente adicionado com sucesso.");
                    this.loadModelClients();
                }
            });
        },

        async onSaveClient() {
            const sFragId = this.createId("ClientsDialogFrag");
            const oNameInput = Fragment.byId(sFragId, "_IDinputClientNameDialog");
            const oPostalInput = Fragment.byId(sFragId, "_IDinputClientPostalDialog");
            const oDialog = Fragment.byId(sFragId, "_IDclientDialog");

            const sName = oNameInput.getValue().trim();
            const sPostal = oPostalInput.getValue().trim();
            const ID = this._sEditingClientId;

            if (!sName || !sPostal) {
                MessageToast.show("Preencha todos os campos.");
                return;
            }

            const oModel = this.getOwnerComponent().getModel("l2dProductsClient");
            const oPayload = { ID, name: sName, postalCode: sPostal };

            try {
                await new Promise((resolve, reject) => {
                    oModel.update(`/Clients(${ID})`, oPayload, {
                        success: resolve,
                        error: reject
                    });
                });
                MessageToast.show("Cliente atualizado com sucesso!");
                if (oDialog) oDialog.close();
                this.loadModelClients();
            } catch (err) {
                console.error("Erro ao atualizar cliente:", err);
                MessageToast.show("Erro ao atualizar cliente.");
            }
        },

        onDeleteClient() {
            const ID = this._sEditingClientId;
            if (!ID) {
                MessageToast.show("Nenhum cliente selecionado para exclusão.");
                return;
            }
            const oModel = this.getOwnerComponent().getModel("l2dProductsClient");
            oModel.remove(`/Clients(${ID})`, {
                success: () => {
                    MessageToast.show("Cliente excluído com sucesso.");
                    this.loadModelClients();
                },
                error: (err) => {
                    console.error("Erro ao excluir cliente:", err);
                    MessageToast.show("Erro ao excluir cliente.");
                }
            });
            const sFragId = this.createId("ClientsDialogFrag");
            const oDialog = Fragment.byId(sFragId, "_IDclientDialog");
            if (oDialog) oDialog.close();
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
                    const qty = Number(order.quantity) || 0;
                    const price = Number(order.price) || 0;
                    return {
                        ID: order.ID,
                        description: order.description,
                        price: order.price,
                        quantity: qty,
                        total: price * qty,
                        category: order.category?.name,
                        product: order.product?.name
                    };
                });
                this.setViewModel("orders", new JSONModel({ items: orders }));
                console.log("Orders carregados:", orders);
            } catch (err) {
                console.error("Erro ao carregar Orders:", err);
            }
        },

        /* ---------- onEditOrder: abre dialog e popula campos usando Fragment.byId ---------- */
        onEditOrder(oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext("orders");
            if (!oContext) return;

            const oData = oContext.getObject();
            this._sEditingOrderId = oData.ID;
            console.log("Editando pedido ID:", this._sEditingOrderId, oData);

            // abre dialog (carrega se necessário) e então popula campos
            this._openOrdersDialog().then(() => {
                const sFragId = this.createId("OrdersDialogFrag");

                const oProdutoCombo = Fragment.byId(sFragId, "_IDinputProdutoDialog");
                const oCategoriaCombo = Fragment.byId(sFragId, "_IDinputCategoriaDialog");
                const oQuantidadeInput = Fragment.byId(sFragId, "_IDinputQuantidadeDialog");
                const oValorInput = Fragment.byId(sFragId, "_IDinputValorDialog");

                // busca ids a partir dos models (se existir product_ID/category_ID use-os)
                const aProducts = this.getViewModelData("products") || [];
                const aCategories = this.getViewModelData("categories") || [];

                const sProductKey = oData.product_ID || (aProducts.find(p => p.name === oData.product) || {}).ID || "";
                const sCategoryKey = oData.category_ID || (aCategories.find(c => c.name === oData.category) || {}).ID || "";

                if (oProdutoCombo) oProdutoCombo.setSelectedKey(sProductKey);
                if (oCategoriaCombo) oCategoriaCombo.setSelectedKey(sCategoryKey);
                if (oQuantidadeInput) oQuantidadeInput.setValue(oData.quantity || "");
                if (oValorInput) oValorInput.setValue(oData.price || "");
            }).catch(err => {
                console.error("Erro ao abrir/popular OrdersDialog:", err);
                MessageToast.show("Erro ao abrir diálogo de pedido.");
            });
        },



        onSaveOrder() {
            const sOrderId = this._sEditingOrderId;
            if (!sOrderId) {
                MessageToast.show("Pedido não selecionado.");
                return;
            }

            const sFragId = this.createId("OrdersDialogFrag");
            const oProdutoCombo = Fragment.byId(sFragId, "_IDinputProdutoDialog");
            const oCategoriaCombo = Fragment.byId(sFragId, "_IDinputCategoriaDialog");
            const oQuantidadeInput = Fragment.byId(sFragId, "_IDinputQuantidadeDialog");
            const oValorInput = Fragment.byId(sFragId, "_IDinputValorDialog");
            const oDialog = Fragment.byId(sFragId, "_IDorderDialog");

            // assume que os controles existem e que validações já ocorreram
            const sProductId = oProdutoCombo.getSelectedKey();
            const sCategoryId = oCategoriaCombo.getSelectedKey();
            const nQty = Number(oQuantidadeInput.getValue().trim()) || 0;
            const nPrice = Number(oValorInput.getValue().trim()) || 0;

            const oV4Model = this.getOwnerComponent().getModel("l2dProductsCatalog");
            const oBinding = oV4Model.bindList("/Orders");
            const oFilter = new Filter("ID", FilterOperator.EQ, sOrderId);

            // fluxo simples com then()
            oBinding.filter([oFilter]).requestContexts().then((aContexts) => {
                if (!aContexts || aContexts.length === 0) {
                    MessageToast.show("Pedido não encontrado para atualização.");
                    return Promise.reject(new Error("Pedido não encontrado"));
                }

                const oContext = aContexts[0];

                // aplica as propriedades diretamente no contexto (V4)
                oContext.setProperty("product_ID", sProductId);
                oContext.setProperty("category_ID", sCategoryId);
                oContext.setProperty("quantity", nQty);
                oContext.setProperty("price", nPrice);

                // fecha dialog, limpa estado e recarrega lista
                if (oDialog && typeof oDialog.close === "function") oDialog.close();
                this._sEditingOrderId = null;
                MessageToast.show("Pedido atualizado.");
                return this.loadModelOrders();
            }).catch((err) => {
                console.error("Erro onSaveOrder (then-chain):", err);
                if (!(err && err.message === "Pedido não encontrado")) {
                    MessageToast.show("Erro ao atualizar o pedido");
                }
            });
        },

        onDeleteOrder() {
            const sOrderId = this._sEditingOrderId;
            if (!sOrderId) {
                MessageToast.show("Pedido não selecionado.");
                return;
            }

            const sFragId = this.createId("OrdersDialogFrag");
            const oDialog = Fragment.byId(sFragId, "_IDorderDialog");

            const oV4Model = this.getOwnerComponent().getModel("l2dProductsCatalog");
            const oBinding = oV4Model.bindList("/Orders");
            const oFilter = new Filter("ID", FilterOperator.EQ, sOrderId);

            oBinding.filter([oFilter]).requestContexts().then((aContexts) => {
                if (!aContexts || aContexts.length === 0) {
                    MessageToast.show("Pedido não encontrado para exclusão.");
                    return Promise.reject(new Error("Pedido não encontrado"));
                }

                const oContext = aContexts[0];
                return oContext.delete().then(() => {
                    // sucesso: fecha dialog, limpa estado e recarrega lista
                    if (oDialog && typeof oDialog.close === "function") oDialog.close();
                    this._sEditingOrderId = null;
                    MessageToast.show("Pedido excluído!");
                    return this.loadModelOrders();
                });
            }).catch((err) => {
                console.error("Erro ao excluir pedido:", err);
                if (!(err && err.message === "Pedido não encontrado")) {
                    MessageToast.show("Erro ao excluir pedido.");
                }
            });
        },

        /* ---------- adicionar pedido ---------- */
        onAddOrder() {
            const sFragId = this.createId("OrdersFrag");

            const produtoCombo = Fragment.byId(sFragId, "_IDinputProduto");
            const valorInput = Fragment.byId(sFragId, "_IDinputValor");
            const categoriaCombo = Fragment.byId(sFragId, "_IDinputCategoria");
            const quantidadeInput = Fragment.byId(sFragId, "_IDinputQuantidade");

            if (!produtoCombo || !categoriaCombo || !valorInput || !quantidadeInput) {
                console.error("Controles não encontrados no fragment OrdersFrag:", {
                    produtoCombo: !!produtoCombo,
                    categoriaCombo: !!categoriaCombo,
                    valorInput: !!valorInput,
                    quantidadeInput: !!quantidadeInput
                });
                MessageToast.show("Erro interno: controles não encontrados.");
                return;
            }

            const valorStr = valorInput.getValue().trim();
            const sProductId = produtoCombo.getSelectedKey();
            const sCategoryId = categoriaCombo.getSelectedKey();

            if (!this._validateFieldPrice(valorInput)) return;
            if (!this._validateFieldQuantity(quantidadeInput)) return;
            if (!sCategoryId) { MessageToast.show("Selecione uma categoria."); return; }
            if (!sProductId) { MessageToast.show("Selecione um produto."); return; }

            const quantidade = Number(quantidadeInput.getValue().trim());
            const valor = Number(valorStr);

            const oModel = this.getOwnerComponent().getModel("l2dProductsCatalog");
            const odataBindingList = oModel.bindList("/Orders");

            const oPayload = {
                price: valor,
                quantity: quantidade,
                product_ID: sProductId,
                category_ID: sCategoryId
            };

            const newEntryContext = odataBindingList.create(oPayload);
            newEntryContext.created().then(() => {
                valorInput.setValue("");
                quantidadeInput.setValue("");
                produtoCombo.setSelectedKey("");
                categoriaCombo.setSelectedKey("");
                MessageToast.show("Item adicionado!");
                this.loadModelOrders();
            }).catch((oError) => {
                console.error("Erro ao criar order:", oError);
                MessageToast.show("Erro ao adicionar item: " + (oError.message || JSON.stringify(oError)));
            });
        },

        /**
            * Fecha um Dialog de forma genérica.
            * - Se chamado como handler de botão (oEvent presente), procura o Dialog subindo a árvore de parents.
            * - Se chamado sem evento, aceita um parâmetro opcional sFragBaseName (ex: "OrdersDialogFrag" ou "OrdersDialog")
            *   e fecha o Dialog encontrado via Fragment.byId(this.createId(sFragBaseName), sDialogControlId).
            *
            * Uso no fragment XML (botão): <Button text="Fechar" press=".onCloseDialogPress" />
            * Uso programático: this._closeDialogByFragmentBase("OrdersDialogFrag", "_IDorderDialog");
        **/
        onCloseDialogPress(oEvent) {
            // 1) Se veio do botão (handler), tenta fechar subindo a árvore de parents
            if (oEvent && oEvent.getSource) {
                try {
                    let oSource = oEvent.getSource();
                    // se o botão estiver dentro de um layout, subimos até encontrar um Dialog
                    while (oSource) {
                        if (oSource.isA && oSource.isA("sap.m.Dialog")) {
                            // fecha e limpa estado
                            if (typeof oSource.close === "function") oSource.close();
                            this._sEditingOrderId = null;
                            return;
                        }
                        // next parent: getParent pode não existir em todos os controls, então protegemos
                        oSource = (typeof oSource.getParent === "function") ? oSource.getParent() : null;
                    }
                } catch (err) {
                    console.warn("Erro ao fechar dialog via evento:", err);
                }
            }

            // 2) Se não veio evento, tenta fechar por fragment base name passado como argumento
            // Permite chamadas: this.onCloseDialogPress(null, "OrdersDialogFrag", "_IDorderDialog")
            const aArgs = Array.prototype.slice.call(arguments);
            const sFragBaseName = aArgs[1] || aArgs[0]; // aceita onCloseDialogPress(null, "OrdersDialogFrag") ou onCloseDialogPress("OrdersDialogFrag")
            const sDialogControlId = aArgs[2] || "_IDorderDialog"; // default id interno do Dialog

            if (sFragBaseName) {
                try {
                    // se o usuário passou um nome sem sufixo "Frag", normalizamos
                    const sFragId = this.createId(sFragBaseName.endsWith("Frag") ? sFragBaseName : (sFragBaseName + "Frag"));
                    const oDialog = Fragment.byId(sFragId, sDialogControlId);
                    if (oDialog && typeof oDialog.close === "function") {
                        oDialog.close();
                        this._sEditingOrderId = null;
                        return;
                    } else {
                        console.warn("Dialog não encontrado via Fragment.byId:", sFragId, sDialogControlId);
                    }
                } catch (err) {
                    console.error("Erro ao fechar dialog por fragment id:", err);
                }
            }

            // se chegou aqui, não encontrou diálogo para fechar
            console.warn("Nenhum diálogo foi fechado: nenhum Dialog encontrado pelo evento, fragment id ou this._dialogs.");
        },

        /* ---------- abrir dialog do Orders (com id prefixado e reuso) ---------- */
        async _openOrdersDialog() {
            this._dialogs = this._dialogs || {};
            const sFragId = this.createId("OrdersDialogFrag");

            if (!this._dialogs["OrdersDialog"]) {
                this._dialogs["OrdersDialog"] = await Fragment.load({
                    id: sFragId,
                    name: "studies.firstui5project.view.fragments.OrdersDialog",
                    controller: this
                });
                this.getView().addDependent(this._dialogs["OrdersDialog"]);
            }
            this._dialogs["OrdersDialog"].open();
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
        /* ---------- evento ao selecionar produto ---------- */
        onProductChange(oEvent) {
            const oCombo = oEvent.getSource();
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) return;

            const sKey = oSelectedItem.getKey();
            const aProducts = this.getViewModelData("products") || [];
            const oProduct = aProducts.find(p => p.ID === sKey);

            // procura o input de valor no fragment da aba Orders e no OrdersDialog
            const oValorInput = this._findControlInFragments(["OrdersFrag", "OrdersDialogFrag"], "_IDinputValor");

            if (!oValorInput) {
                console.warn("Input de valor não encontrado em nenhum fragment (OrdersFrag/OrdersDialogFrag).");
                return;
            }

            if (oProduct && (oProduct.price !== undefined && oProduct.price !== null)) {
                oValorInput.setValue(oProduct.price);
                oValorInput.setEditable(false);
            } else {
                oValorInput.setValue("");
                oValorInput.setEditable(true);
            }
        },

        onAddProduct() {
            const sFragId = this.createId("ProductsFrag");

            // pega o input do nome do produto
            const oNameInput = Fragment.byId(sFragId, "_IDinputProductName");

            console.log(oNameInput ? `Input de nome encontrado: ${oNameInput}` : "Input de nome NÃO encontrado.");
            if (!oNameInput) {
                console.error("Input de nome não encontrado no fragment ProductsFrag");
                MessageToast.show("Erro interno: campo não encontrado.");
                return;
            }

            const sName = oNameInput.getValue().trim();
            console.log(`Tentando adicionar produto com nome: "${sName}"`);

            // validação simples
            if (!sName) {
                MessageToast.show("Digite o nome do produto.");
                oNameInput.setValueState("Error");
                oNameInput.setValueStateText("Nome obrigatório");
                return;
            }

            // pega o modelo OData
            const oModel = this.getOwnerComponent().getModel("l2dProductsCatalog");
            const odataBindingList = oModel.bindList("/Products");

            // payload só com o campo name
            const oPayload = {
                name: sName
            };

            // cria o novo produto
            const newEntryContext = odataBindingList.create(oPayload);

            newEntryContext.created().then(() => {
                // limpa o campo
                oNameInput.setValue("");
                oNameInput.setValueState("None");
                MessageToast.show("Produto adicionado!");
                // recarrega a lista
                this.loadModelProducts();
            }).catch((oError) => {
                console.error("Erro ao criar produto:", oError);
                MessageToast.show("Erro ao adicionar produto: " + (oError.message || JSON.stringify(oError)));
            });
        },

        async _openProductsDialog() {
            this._dialogs = this._dialogs || {}; // inicializa objeto de diálogos se ainda não existir
            const sFragId = this.createId("ProductsDialogFrag"); //cria um id único para o fragmento

            if (!this._dialogs["ProductsDialog"]) {
                this._dialogs["ProductsDialog"] = await Fragment.load({
                    id: sFragId,
                    name: "studies.firstui5project.view.fragments.ProductsDialog",
                    controller: this
                });
                this.getView().addDependent(this._dialogs["ProductsDialog"]);
            }
            this._dialogs["ProductsDialog"].open();
        },

        onEditProduct(oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext("products");
            if (!oContext) return;

            const oData = oContext.getObject();
            this._sEditingProductId = oData.ID;
            console.log("Editando produto ID:", this._sEditingProductId, oData);

            // abre dialog (carrega se necessário) e então popula campos
            this._openProductsDialog().then(() => {
                const sFragId = this.createId("ProductsDialogFrag");
                const oNameInput = Fragment.byId(sFragId, "_IDinputProductNameDialog");
                if (oNameInput) {
                    oNameInput.setValue(oData.name || "");
                } else {
                    console.warn("Input de nome do produto não encontrado no fragment ProductsDialogFrag.");
                }
            }).catch(err => {
                console.error("Erro ao abrir/popular ProductsDialog:", err);
                MessageToast.show("Erro ao abrir diálogo de produto.");
            });
        },

        onSaveProduct() {
            const sProductId = this._sEditingProductId; // ID do produto sendo editado
            if (!sProductId) {
                MessageToast().show("Produto não selecionado para edição.");
                return;
            }

            const sFragId = this.createId("ProductsDialogFrag");
            const oNameInput = Fragment.byId(sFragId, "_IDinputProductNameDialog");
            const oDialog = Fragment.byId(sFragId, "_IDproductDialog");

            if (!oNameInput) {
                console.error("Input de nome do produto não encontrado no fragment ProductsDialogFrag.");
                MessageToast.show("Erro interno: campo de nome não encontrado.");
                return;
            }

            const sName = oNameInput.getValue().trim();
            if (!sName) {
                MessageToast.show("Digite o nome do produto.");
                oNameInput.setValueState("Error");
                oNameInput.setValueStateText("Nome obrigatório");
                return;
            }

            const oModel = this.getOwnerComponent().getModel("l2dProductsCatalog");
            const odataBindingList = oModel.bindList("/Products");
            const oFilter = new Filter("ID", FilterOperator.EQ, sProductId);

            odataBindingList.filter([oFilter]).requestContexts().then((aContexts) => {
                if (!aContexts || aContexts.length === 0) {
                    MessageToast.show("Produto não encontrado para atualização.");
                    return Promise.reject(new Error("Produto não encontrado"));
                }

                const oContext = aContexts[0];
                oContext.setProperty("name", sName);

                if (oDialog && typeof oDialog.close === "function") oDialog.close();
                this._sEditingProductId = null;
                MessageToast.show("Produto atualizado!");
                return this.loadModelProducts();
            }).catch((err) => {
                console.error("Erro ao salvar produto:", err);
                if (!(err && err.message === "Produto não encontrado")) {
                    MessageToast.show("Erro ao atualizar produto.");
                }
            });
        },

        onDeleteProduct() {
            const sProductId = this._sEditingProductId;
            if (!sProductId) {
                MessageToast.show("Produto não selecionado para exclusão.");
                return;
            }

            const sFragId = this.createId("ProductsDialogFrag");
            const oDialog = Fragment.byId(sFragId, "_IDproductDialog");

            const oModel = this.getOwnerComponent().getModel("l2dProductsCatalog");
            const odataBindingList = oModel.bindList("/Products");
            const oFilter = new Filter("ID", FilterOperator.EQ, sProductId);

            odataBindingList.filter([oFilter]).requestContexts().then((aContexts) => {
                if (!aContexts || aContexts.length === 0) {
                    MessageToast.show("Produto não encontrado para exclusão.");
                    return Promise.reject(new Error("Produto não encontrado"));
                }

                const oContext = aContexts[0];
                return oContext.delete().then(() => {
                    if (oDialog && typeof oDialog.close === "function") oDialog.close();
                    this._sEditingProductId = null;
                    MessageToast.show("Produto excluído!");
                    return this.loadModelProducts();
                });
            }).catch((err) => {
                console.error("Erro ao excluir produto:", err);
                if (!(err && err.message === "Produto não encontrado")) {
                    MessageToast.show("Erro ao excluir produto.");
                }
            });
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

        onAddCategory() {
            const sFragId = this.createId("CategoriesFrag");
            const oNameInput = Fragment.byId(sFragId, "_IDinputCategoryName");

            if (!oNameInput) {
                console.error("Input de nome da categoria não encontrado no fragment CategoriesFrag.");
                MessageToast.show("Erro interno: campo de nome não encontrado.");
                return;
            }

            const sName = oNameInput.getValue().trim();
            if (!sName) {
                MessageToast.show("Digite o nome da categoria.");
                oNameInput.setValueState("Error");
                oNameInput.setValueStateText("Nome obrigatório");
                return;
            }

            const oModel = this.getOwnerComponent().getModel("l2dProductsCatalog");
            const odataBindingList = oModel.bindList("/Categories");

            const oPayload = { name: sName };

            const newEntryContext = odataBindingList.create(oPayload);
            newEntryContext.created().then(() => {
                oNameInput.setValue("");
                oNameInput.setValueState("None");
                MessageToast.show("Categoria adicionada!");
                this.loadModelCategories();
            }).catch((oError) => {
                console.error("Erro ao criar categoria:", oError);
                MessageToast.show("Erro ao adicionar categoria: " + (oError.message || JSON.stringify(oError)));
            });
        },

        onEditCategory(oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext("categories");
            if (!oContext) return;

            const oData = oContext.getObject();
            this._sEditingCategoryId = oData.ID;
            console.log("Editando categoria ID:", this._sEditingCategoryId, oData);

            // abre dialog (carrega se necessário) e então popula campos
            this._openCategoriesDialog().then(() => {
                const sFragId = this.createId("CategoriesDialogFrag");
                const oNameInput = Fragment.byId(sFragId, "_IDinputCategoryNameDialog");
                if (oNameInput) {
                    oNameInput.setValue(oData.name || "");
                } else {
                    console.warn("Input de nome da categoria não encontrado no fragment CategoriesDialogFrag.");
                }
            }).catch(err => {
                console.error("Erro ao abrir/popular CategoriesDialog:", err);
                MessageToast.show("Erro ao abrir diálogo de categoria.");
            });
        },

        onSaveCategory() {
            const sCategoryId = this._sEditingCategoryId;
            if (!sCategoryId) {
                MessageToast.show("Categoria não selecionada para edição.");
                return;
            }

            const sFragId = this.createId("CategoriesDialogFrag");
            const oNameInput = Fragment.byId(sFragId, "_IDinputCategoryNameDialog");
            const oDialog = Fragment.byId(sFragId, "_IDcategoryDialog");

            if (!oNameInput) {
                console.error("Input de nome da categoria não encontrado no fragment CategoriesDialogFrag.");
                MessageToast.show("Erro interno: campo de nome não encontrado.");
                return;
            }

            const sName = oNameInput.getValue().trim();
            if (!sName) {
                MessageToast.show("Digite o nome da categoria.");
                oNameInput.setValueState("Error");
                oNameInput.setValueStateText("Nome obrigatório");
                return;
            }

            const oModel = this.getOwnerComponent().getModel("l2dProductsCatalog");
            const odataBindingList = oModel.bindList("/Categories");
            const oFilter = new Filter("ID", FilterOperator.EQ, sCategoryId);

            odataBindingList.filter([oFilter]).requestContexts().then((aContexts) => {
                if (!aContexts || aContexts.length === 0) {
                    MessageToast.show("Categoria não encontrada para atualização.");
                    return Promise.reject(new Error("Categoria não encontrada"));
                }

                const oContext = aContexts[0];
                oContext.setProperty("name", sName);

                if (oDialog && typeof oDialog.close === "function") oDialog.close();
                this._sEditingCategoryId = null;
                MessageToast.show("Categoria atualizada!");
                return this.loadModelCategories();
            }).catch((err) => {
                console.error("Erro ao salvar categoria:", err);
                if (!(err && err.message === "Categoria não encontrada")) {
                    MessageToast.show("Erro ao atualizar categoria.");
                }
            });
        },

        onDeleteCategory() {
            const sCategoryId = this._sEditingCategoryId;
            if (!sCategoryId) {
                MessageToast.show("Categoria não selecionada para exclusão.");
                return;
            }

            const sFragId = this.createId("CategoriesDialogFrag");
            const oDialog = Fragment.byId(sFragId, "_IDcategoryDialog");

            const oModel = this.getOwnerComponent().getModel("l2dProductsCatalog");
            const odataBindingList = oModel.bindList("/Categories");
            const oFilter = new Filter("ID", FilterOperator.EQ, sCategoryId);

            odataBindingList.filter([oFilter]).requestContexts().then((aContexts) => {
                if (!aContexts || aContexts.length === 0) {
                    MessageToast.show("Categoria não encontrada para exclusão.");
                    return Promise.reject(new Error("Categoria não encontrada"));
                }

                const oContext = aContexts[0];
                return oContext.delete().then(() => {
                    if (oDialog && typeof oDialog.close === "function") oDialog.close();
                    this._sEditingCategoryId = null;
                    MessageToast.show("Categoria excluída!");
                    return this.loadModelCategories();
                });
            }).catch((err) => {
                console.error("Erro ao excluir categoria:", err);
                if (!(err && err.message === "Categoria não encontrada")) {
                    MessageToast.show("Erro ao excluir categoria.");
                }
            });
        },

        async _openCategoriesDialog() {
            this._dialogs = this._dialogs || {};
            const sFragId = this.createId("CategoriesDialogFrag");

            if (!this._dialogs["CategoriesDialog"]) {
                this._dialogs["CategoriesDialog"] = await Fragment.load({
                    id: sFragId,
                    name: "studies.firstui5project.view.fragments.CategoriesDialog",
                    controller: this
                });
                this.getView().addDependent(this._dialogs["CategoriesDialog"]);
            }
            this._dialogs["CategoriesDialog"].open();
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
        },
        _validateFieldQuantity(oInput) {
            if (!oInput) return false;
            const value = oInput.getValue().trim();
            if (!value) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Quantidade obrigatória");
                return false;
            }
            const number = Number(value);
            if (isNaN(number) || number <= 0) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Digite uma quantidade válida");
                return false;
            }
            oInput.setValueState("None");
            return true;
        }
    });
});
