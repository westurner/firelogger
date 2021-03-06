(function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

    function openHelpLink(topic) {
        var url = "http://github.com/darwin/firelogger/wikis/"+topic;
        var args = window.arguments[0];
        var FBL = args.FBL;
        FBL.openNewTab(url);
    }

    function openPrefsHelp() {
      var helpTopic = document.getElementsByTagName("prefwindow")[0].currentPane.helpTopic;
      openHelpLink(helpTopic);
    }
    
    FireLogger.MainPrefPane = {
        _disablePasswordProtectionButton : null,

        /////////////////////////////////////////////////////////////////////////////////////////
        init: function() {
            var args = window.arguments[0];
            this._FBL = args.FBL;

            this._passwordEdit = document.getElementById("firelogger-preferences-main-password"); 
            this._disablePasswordProtectionButton = document.getElementById("firelogger-preferences-main-disable-password-protection");

            this.update(true);
        },
        /////////////////////////////////////////////////////////////////////////////////////////
        disablePasswordProtection: function() {
            FireLogger.PasswordVault.set("");
            this.update(true);
        },
        /////////////////////////////////////////////////////////////////////////////////////////
        update: function(noFetch) {
            var that = this;
            
            if (!noFetch) { 
                FireLogger.PasswordVault.set(this._passwordEdit.value);
            }
            this._passwordEdit.value = FireLogger.PasswordVault.get();
            
            setTimeout(function(){
                var enabled = FireLogger.PasswordVault.get().replace(/^\s+|\s+$/g,"")!="";
                that._disablePasswordProtectionButton.disabled = !enabled;
            }, 100);
        }
    };

    FireLogger.RewritesPrefPane = {
        _tree : null,
        _removeButton : null,
        _changeButton : null,

        /////////////////////////////////////////////////////////////////////////////////////////
        getRewritesListNode: function() {
            return document.getElementById("firelogger-preferences-rewrites-list");
        },
        /////////////////////////////////////////////////////////////////////////////////////////
        init: function() {
            var args = window.arguments[0];
            this._FBL = args.FBL;

            this._removeButton = document.getElementById("firelogger-preferences-rewrites-remove-rule");
            this._changeButton = document.getElementById("firelogger-preferences-rewrites-change-rule");
            this._moveUpButton = document.getElementById("firelogger-preferences-rewrites-move-up");
            this._moveDownButton = document.getElementById("firelogger-preferences-rewrites-move-down");

            this._tree = this.getRewritesListNode();
            this._treeView = {
                data: FireLogger.Rewriter.loadItems(),
                selection: null,

                get rowCount() { return this.data.length; },
                getCellText: function(row, column) {
                    switch(column.id) {
                    case "firelogger-preferences-rewrites-list-number":
                        return (row+1)+".";
                    case "firelogger-preferences-rewrites-list-original":
                        return this.data[row].original;
                    case "firelogger-preferences-rewrites-list-replacement":
                        return this.data[row].replacement;
                    }
                    return "";
                },
                setTree: function(treebox){ this.treebox = treebox; },
                isContainer: function(row) { return false; },
                isContainerOpen: function(row) { return false; },
                isContainerEmpty: function(row) { return false; },
                isSeparator: function(row) { return false; },
                isSorted: function() { return false; },
                getLevel: function(row) { return 0; },
                getImageSrc: function(row,column) { return null; },
                getRowProperties: function(row,props) {},
                getCellProperties: function(row,column,props) {},
                getColumnProperties: function(colid,column,props) {}
            };

            this.update(true);
        },
        /////////////////////////////////////////////////////////////////////////////////////////
        refresh: function() {
            this._tree.view = this._treeView;
        },
        /////////////////////////////////////////////////////////////////////////////////////////
        update: function() {
            this.refresh();
            
            var selection = this._tree.view.selection;
            this._removeButton.disabled = (selection.count != 1);
            this._changeButton.disabled = (selection.count != 1);
            this._moveUpButton.disabled = (selection.count != 1) || (selection.currentIndex == 0);
            this._moveDownButton.disabled = (selection.count != 1) || (selection.currentIndex == this._treeView.data.length-1);
        },
        /////////////////////////////////////////////////////////////////////////////////////////
        onSelectionChanged: function() {
            this.update();
        },
        /////////////////////////////////////////////////////////////////////////////////////////
        moveUpRewriteRule: function() {
            var selection = this._tree.view.selection;
            if (selection.count<1) return;
            if (selection.currentIndex==0) return;
            var item = this._treeView.data[selection.currentIndex];
            FireLogger.Rewriter.moveUpItem(item);
            this._treeView.data[selection.currentIndex] = this._treeView.data[selection.currentIndex-1];
            this._treeView.data[selection.currentIndex-1] = item;
            this._tree.view.selection.select(selection.currentIndex-1);
            this.refresh();
        },
        /////////////////////////////////////////////////////////////////////////////////////////
        moveDownRewriteRule: function() {
            var selection = this._tree.view.selection;
            if (selection.count<1) return;
            if (selection.currentIndex==this._treeView.data.length-1) return;
            var item = this._treeView.data[selection.currentIndex];
            FireLogger.Rewriter.moveDownItem(item);
            this._treeView.data[selection.currentIndex] = this._treeView.data[selection.currentIndex+1];
            this._treeView.data[selection.currentIndex+1] = item;
            this._tree.view.selection.select(selection.currentIndex+1);
            this.refresh();
        },
        /////////////////////////////////////////////////////////////////////////////////////////
        addRewriteRule: function() {
            var item = { original:"", flags:"i", replacement:"" };
            var result = {};
            openDialog("chrome://firelogger/content/rewrite-rule.xul",  "_blank", "modal,centerscreen", item, result);
            if (!result.saveChanges) return
            FireLogger.Rewriter.addItem(item);
            this._treeView.data.push(item);
            this.refresh();
        },
        /////////////////////////////////////////////////////////////////////////////////////////
        removeRewriteRule: function() {
            var selection = this._tree.view.selection;
            if (selection.count<1) return;
            var item = this._treeView.data[selection.currentIndex];
            FireLogger.Rewriter.removeItem(item);
            this._treeView.data.splice(selection.currentIndex, 1);
            this.refresh();
        },
        /////////////////////////////////////////////////////////////////////////////////////////
        changeRewriteRule: function() {
            var selection = this._tree.view.selection;
            if (selection.count!=1) return;
            var item = this._treeView.data[selection.currentIndex];
            var result = {};
            openDialog("chrome://firelogger/content/rewrite-rule.xul",  "_blank", "modal,centerscreen", item, result);
            if (result.saveChanges) {
                FireLogger.Rewriter.saveItem(item);
            }
            this.refresh();
        },
        /////////////////////////////////////////////////////////////////////////////////////////
        testRules: function() {
            var question = document.getElementById("firelogger-preferences-rewrites-tester-input").value;
            var res = FireLogger.Rewriter.rewritePath(question, true);
            document.getElementById("firelogger-preferences-rewrites-tester-answer").value = res[0];
            document.getElementById("firelogger-preferences-rewrites-tester-reason").value = res[1];
        }
    };
    
    FireLogger.AppEnginePrefPane = {

        /////////////////////////////////////////////////////////////////////////////////////////
        init: function() {
        }
    };
    
})();
