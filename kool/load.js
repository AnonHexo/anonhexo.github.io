$(document).ready(function () {
    $(document).bind("contextmenu", function () {
        return false
    })
    $(document).keydown(function (event) {
        if (event.keyCode == 123) {
            return false
        } else if ((event.ctrlKey && event.shiftKey && event.keyCode == 73) || (event.ctrlKey && event.shiftKey && event.keyCode == 74)) {
            return false
        }
    })
})
$(document).keydown(function () {
    $(document).trigger("click")
})
$(document).scroll(function () {
    $(document).trigger("click")
})
$(document).contextmenu(function () {
    $(document).trigger("click")
})
$(document).click(function () {
    $("video").get(0).play()
    $("video").prop("muted", false)
    $("video").css("visibility", "visible")
    $(".popup").css("visibility", "hidden")
})