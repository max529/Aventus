export var compilerTemplate = `class $classname extends $parentClass {
    $watchingAttributes
    $variablesStatic
    $isAbstract
    $getterSetter
    $variables
    $watches
    $allLangs
    $translations

    __getStyle() {
        let arrStyle = super.__getStyle();
        arrStyle.push(\`$style\`);
        return arrStyle;
    }
    __getHtml() {
        let parentInfo = super.__getHtml();
        let info = {
            html: \`$template\`,
            slots: {
                $slotHTML
            },
            blocks: {
                $blockHTML
            }
        }

        $overrideView

        return info;
    }

    $loop
    $states
    __getMaxId() {
        let temp = super.__getMaxId();
        temp.push(["$classname", $maxId])
        return temp;
    }
    $variablesInViewDynamic
    $variablesInViewStatic
    $registerOnChange
    $constructor

    getClassName() {
        return "$classname";
    }

    $defaultValue
    $upgradeAttributes
    $listBool
    $eventsMapped
    $applyTranslations

    $methods
}

window.customElements.define('$balisename', $classname);`