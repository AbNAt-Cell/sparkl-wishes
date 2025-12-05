{/* ADD ITEM MODAL – Mobile-Perfect, No Growing Fields */}
<Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
  <DialogTrigger asChild>
    <Button className="shadow-elegant">
      <Plus className="w-4 h-4 mr-2" />
      Add Item
    </Button>
  </DialogTrigger>

  <DialogContent className="w-full max-w-lg p-6 sm:p-8 max-h-[95vh] overflow-y-auto">
    <DialogHeader className="space-y-3">
      <DialogTitle className="text-2xl">Add New Item</DialogTitle>
      <DialogDescription className="text-base">
        Add a gift you'd love to receive
      </DialogDescription>
    </DialogHeader>

    <ScrollArea className="max-h-[calc(95vh-14rem)] pr-4">
      <form onSubmit={handleAddItem} className="space-y-6 py-4">
        {/* Item Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-base">Item Name <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            value={itemFormData.name}
            onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
            required
            placeholder="e.g. AirPods Pro"
            className="h-12 text-base"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="desc" className="text-base">Description (Optional)</Label>
          <Textarea
            id="desc"
            value={itemFormData.description}
            onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
            placeholder="Why do you want this? Any color/size preference?"
            rows={4}
            className="resize-none text-base"
          />
        </div>

        {/* Price Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="min" className="text-base">Min Price</Label>
            <PriceInput
              id="min"
              value={itemFormData.price_min}
              onChange={(v) => setItemFormData({ ...itemFormData, price_min: v })}
              currencySymbol={getCurrencySymbol(wishlist.currency || "NGN")}
              placeholder="0"
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max" className="text-base">Max Price</Label>
            <PriceInput
              id="max"
              value={itemFormData.price_max}
              onChange={(v) => setItemFormData({ ...itemFormData, price_max: v })}
              currencySymbol={getCurrencySymbol(wishlist.currency || "NGN")}
              placeholder="0"
              className="h-12"
            />
          </div>
        </div>

        {/* Product Link */}
        <div className="space-y-2">
          <Label htmlFor="link" className="text-base">Product Link (Optional)</Label>
          <Input
            id="link"
            type="url"
            value={itemFormData.external_link}
            onChange={(e) => setItemFormData({ ...itemFormData, external_link: e.target.value })}
            placeholder="https://amazon.com/..."
            className="h-12 text-base"
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-3">
          <Label className="text-base">Item Image (Optional)</Label>
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-dashed">
              <img src={imagePreview} alt="Preview" className="w-full aspect-video object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-3 right-3 rounded-full h-9 w-9"
                onClick={handleRemoveImage}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4 border-2 border-dashed rounded-xl p-6 text-center">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="mx-auto max-w-xs"
              />
              {uploadingImage && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                </p>
              )}
              <p className="text-sm text-muted-foreground">or</p>
              <Input
                type="url"
                placeholder="Paste image URL"
                value={itemFormData.image_url}
                onChange={(e) => {
                  const url = e.target.value;
                  setItemFormData({ ...itemFormData, image_url: url });
                  if (url) setImagePreview(url);
                }}
                className="mx-auto max-w-sm h-12"
              />
            </div>
          )}
        </div>

        {/* Claim Type */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Who can claim this item?</Label>
          <RadioGroup
            value={itemFormData.allow_group_gifting ? "group" : "single"}
            onValueChange={(v) => setItemFormData({ ...itemFormData, allow_group_gifting: v === "group" })}
          >
            <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="single" id="single" />
              <Label htmlFor="single" className="cursor-pointer flex-1 text-base">
                Single Person
                <p className="text-sm text-muted-foreground font-normal">One person buys the full gift</p>
              </Label>
            </div>
            <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="group" id="group" />
              <Label htmlFor="group" className="cursor-pointer flex-1 text-base">
                Group Gifting
                <p className="text-sm text-muted-foreground font-normal">Friends contribute together</p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          className="w-full h-14 text-lg font-medium shadow-elegant"
        >
          Add Item
        </Button>
      </form>
    </ScrollArea>
  </DialogContent>
</Dialog>

      {/* Delete Confirmation - extra side padding */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="p-6 sm:p-8">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-4">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="w-full sm:w-auto bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// THIS LINE WAS MISSING — THIS FIXES YOUR VERCEL BUILD ERROR
export default WishlistDetail;
