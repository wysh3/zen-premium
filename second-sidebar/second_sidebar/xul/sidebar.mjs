import { VBox } from "./base/vbox.mjs";

export class Sidebar extends VBox {
  constructor() {
    super({ id: "sidebar-2" });
  this.setAttribute("pinned", "false");
  }

  /**
   *
   * @returns {Sidebar}
   */
  pin() {
    return this.setAttribute("pinned", "true");
  }

  /**
   *
   * @returns {Sidebar}
   */
  unpin() {
    return this.setAttribute("pinned", "false");
  }

  /**
   *
   * @returns {boolean}
   */
  pinned() {
    return this.getAttribute("pinned") === "true";
  }
}
